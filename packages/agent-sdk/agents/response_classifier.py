"""
Response Classification Agent

Classifies creator responses in the Webflow Marketplace review workflow.
Determines if a response indicates readiness for re-review.

Improvements over Zapier version:
- Confidence scoring (not just binary)
- Multi-intent detection
- Escalation path for ambiguous cases
- Structured reasoning output

Usage:
    from agents.response_classifier import classify_response
    
    result = classify_response(
        response_text="I've made all the requested changes. Ready for review!",
        config_version="v1.0.0"
    )
    # Returns:
    # {
    #     "primary_intent": "ready_for_review",
    #     "confidence": 0.95,
    #     "should_update_status": True,
    #     "escalate": False,
    #     "intents": [{"intent": "ready_for_review", "confidence": 0.95}],
    #     "reasoning": "Clear completion language with explicit review request"
    # }
"""

import json
from typing import TypedDict, Literal
from anthropic import Anthropic

# Intent categories
Intent = Literal[
    "ready_for_review",      # Work is complete, ready for reviewer
    "question_clarification", # Creator needs clarification
    "still_working",          # Creator acknowledges but still working
    "status_check",           # Just checking in, no action needed
    "ambiguous"               # Mixed signals, unclear intent
]

class IntentScore(TypedDict):
    intent: Intent
    confidence: float

class ClassificationResult(TypedDict):
    primary_intent: Intent
    confidence: float
    should_update_status: bool
    escalate: bool
    intents: list[IntentScore]
    reasoning: str
    raw_response: str

# Prompt versions for A/B testing and iteration
PROMPTS = {
    "v1.0.0": """You are classifying creator responses in a marketplace review workflow.

A creator has responded to feedback on their submission. Determine their intent.

## Intent Categories

1. **ready_for_review** - Work is complete, creator wants re-review
   - Examples: "I've made the changes", "Updates complete", "Please review again"
   
2. **question_clarification** - Creator needs more information
   - Examples: "What do you mean by...", "Can you explain...", "I'm not sure about..."
   
3. **still_working** - Creator acknowledges but isn't done
   - Examples: "Working on it", "Will update soon", "Need more time"
   
4. **status_check** - Just checking in, no real update
   - Examples: "Any updates?", "Just following up", "Is this being looked at?"
   
5. **ambiguous** - Mixed signals or unclear intent
   - Examples: "I think I fixed most issues" (partial), mixed questions and completions

## Response Format

Return JSON:
{
  "primary_intent": "<most likely intent>",
  "confidence": <0.0-1.0>,
  "intents": [{"intent": "<intent>", "confidence": <0.0-1.0>}, ...],
  "reasoning": "<brief explanation>"
}

## Rules

- If confidence < 0.70, primary_intent should be "ambiguous"
- If multiple strong intents detected, list all in "intents" array
- "ready_for_review" requires explicit completion language (not just "I fixed X")

## Creator Response

{response_text}
""",
    
    "v1.1.0": """<same structure but with few-shot examples>""",
}

def get_prompt(response_text: str, version: str = "v1.0.0") -> str:
    """Get the classification prompt for a given version."""
    template = PROMPTS.get(version, PROMPTS["v1.0.0"])
    return template.format(response_text=response_text)

def classify_response(
    response_text: str,
    config_version: str = "v1.0.0",
    confidence_threshold: float = 0.85,
    escalation_threshold: float = 0.70,
    api_key: str | None = None
) -> ClassificationResult:
    """
    Classify a creator response and determine if status should be updated.
    
    Args:
        response_text: The creator's response text
        config_version: Prompt version for A/B testing
        confidence_threshold: Minimum confidence to auto-update status
        escalation_threshold: Below this, flag for human review
        api_key: Anthropic API key (uses ANTHROPIC_API_KEY env var if not provided)
    
    Returns:
        ClassificationResult with intent, confidence, and action recommendations
    """
    client = Anthropic(api_key=api_key) if api_key else Anthropic()
    
    prompt = get_prompt(response_text, config_version)
    
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        temperature=0.3,  # Lower temp for more consistent classification
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    
    raw_response = message.content[0].text
    
    # Parse JSON response
    try:
        # Handle potential markdown code blocks
        json_str = raw_response
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0]
        
        parsed = json.loads(json_str.strip())
    except json.JSONDecodeError:
        # Fallback if JSON parsing fails
        return ClassificationResult(
            primary_intent="ambiguous",
            confidence=0.0,
            should_update_status=False,
            escalate=True,
            intents=[{"intent": "ambiguous", "confidence": 0.0}],
            reasoning="Failed to parse LLM response",
            raw_response=raw_response
        )
    
    primary_intent = parsed.get("primary_intent", "ambiguous")
    confidence = parsed.get("confidence", 0.0)
    intents = parsed.get("intents", [{"intent": primary_intent, "confidence": confidence}])
    reasoning = parsed.get("reasoning", "")
    
    # Determine actions based on thresholds
    should_update_status = (
        primary_intent == "ready_for_review" and 
        confidence >= confidence_threshold
    )
    
    escalate = confidence < escalation_threshold
    
    return ClassificationResult(
        primary_intent=primary_intent,
        confidence=confidence,
        should_update_status=should_update_status,
        escalate=escalate,
        intents=intents,
        reasoning=reasoning,
        raw_response=raw_response
    )


# Airtable automation entry point
def handle_airtable_webhook(event: dict) -> dict:
    """
    Entry point for Airtable automation webhook.
    
    Expected event format:
    {
        "response_text": "...",
        "asset_id": "...",
        "zendesk_ticket_id": "...",
        "config_version": "v1.0.0"  # optional
    }
    
    Returns action to take in Airtable.
    """
    response_text = event.get("response_text", "")
    config_version = event.get("config_version", "v1.0.0")
    
    result = classify_response(response_text, config_version)
    
    return {
        "asset_id": event.get("asset_id"),
        "classification": result,
        "action": {
            "update_status": result["should_update_status"],
            "new_status": "🔁Response to Review" if result["should_update_status"] else None,
            "escalate_to_human": result["escalate"],
            "add_note": result["reasoning"] if result["escalate"] else None
        }
    }


if __name__ == "__main__":
    # Test examples
    test_responses = [
        "I've made all the requested changes and the template is ready for review!",
        "What do you mean by 'inconsistent spacing'? Can you show me where?",
        "Still working on the navigation issue, will update you tomorrow.",
        "I think I've fixed most of the issues you mentioned.",
        "I've updated the colors. Also, is the footer supposed to be sticky?"
    ]
    
    print("Response Classification Test\n" + "=" * 50)
    
    for response in test_responses:
        print(f"\nResponse: \"{response[:60]}...\"")
        try:
            result = classify_response(response)
            print(f"  Intent: {result['primary_intent']} ({result['confidence']:.0%})")
            print(f"  Update status: {result['should_update_status']}")
            print(f"  Escalate: {result['escalate']}")
            print(f"  Reasoning: {result['reasoning']}")
        except Exception as e:
            print(f"  Error: {e}")
