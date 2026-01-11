"""
Modal Deployment for CREATE SOMETHING Pattern Extractor

Deploy: modal deploy modal_app.py
Test locally: modal run modal_app.py

Client endpoint (after deploy):
  POST https://createsomethingtoday--pattern-extractor-extract-patterns.modal.run
  Body: {"html": "<html>...", "template_name": "optional-name"}
"""

import modal
from pydantic import BaseModel

# Define the image with our dependencies
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "google-genai>=1.0.0",
    "anthropic>=0.40.0",
    "pydantic>=2.0",
    "httpx>=0.27.0",
    "fastapi[standard]>=0.115.0",  # Required for fastapi_endpoint
)


class ExtractRequest(BaseModel):
    """Request body for pattern extraction endpoint."""
    html: str
    template_name: str = "template"

app = modal.App(
    "pattern-extractor",
    image=image,
    secrets=[
        modal.Secret.from_name("google-api-key"),  # GOOGLE_API_KEY
    ],
)


def _extract_patterns_impl(html: str, template_name: str = "template") -> dict:
    """
    Core extraction logic - shared between web endpoint and test function.
    """
    import json
    import os

    # Inline the extraction logic to avoid import issues
    from google import genai
    from google.genai import types

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return {"success": False, "error": "GOOGLE_API_KEY not configured"}

    client = genai.Client(api_key=api_key)

    # Extraction prompt (simplified version)
    prompt = f"""Analyze this HTML template and extract UI patterns as JSON.

Template:
```html
{html[:50000]}
```

Return a JSON object with this exact structure:
{{
  "components": [
    {{
      "category": "hero|navigation|card|footer|header|section|form|testimonial|pricing|cta|feature|gallery",
      "name": "Component Name",
      "description": "What this component does",
      "css_classes": ["class1", "class2"],
      "html_snippet": "<div>...</div>"
    }}
  ],
  "colors": ["#hex1", "#hex2"],
  "fonts": ["Font Name 1", "Font Name 2"],
  "interactions": [
    {{
      "type": "hover|scroll|click",
      "trigger": ".selector:hover",
      "description": "What happens"
    }}
  ]
}}

Return ONLY valid JSON, no markdown or explanation."""

    output = ""
    try:
        config = types.GenerateContentConfig(
            max_output_tokens=8000,
            temperature=0.1,
        )

        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=config,
        )

        output = response.text or ""

        # Clean JSON from markdown
        if "```json" in output:
            output = output.split("```json")[1].split("```")[0]
        elif "```" in output:
            output = output.split("```")[1].split("```")[0]

        result = json.loads(output.strip())

        # Get token usage
        input_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
        output_tokens = getattr(response.usage_metadata, "candidates_token_count", 0) or 0
        cost = (input_tokens * 0.075 + output_tokens * 0.30) / 1_000_000

        return {
            "success": True,
            "template_name": template_name,
            "components": result.get("components", []),
            "colors": result.get("colors", []),
            "fonts": result.get("fonts", []),
            "interactions": result.get("interactions", []),
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": round(cost, 6),
            }
        }

    except json.JSONDecodeError as e:
        return {"success": False, "error": f"Failed to parse JSON: {e}", "raw_output": output[:500]}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.function(timeout=120)
@modal.fastapi_endpoint(method="POST")
def extract_patterns(request: ExtractRequest) -> dict:
    """
    Extract patterns from HTML template (web endpoint).

    POST https://createsomethingtoday--pattern-extractor-extract-patterns.modal.run
    Body: {"html": "<html>...", "template_name": "my-template"}
    """
    return _extract_patterns_impl(request.html, request.template_name)


@app.function(timeout=120)
def extract_patterns_remote(html: str, template_name: str = "template") -> dict:
    """
    Extract patterns from HTML template (callable via .remote() for testing).
    """
    return _extract_patterns_impl(html, template_name)


@app.function()
@modal.fastapi_endpoint(method="GET")
def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "pattern-extractor"}


# Local testing entrypoint
@app.local_entrypoint()
def main():
    """Test locally with: modal run modal_app.py"""
    test_html = """
    <html>
    <head><style>.hero { background: #1a1a1a; } .btn:hover { opacity: 0.8; }</style></head>
    <body>
        <nav class="navbar"><a href="/">Home</a></nav>
        <section class="hero"><h1>Welcome</h1><button class="btn">Get Started</button></section>
        <footer>Copyright 2025</footer>
    </body>
    </html>
    """

    # Use the remote-callable function (runs in Modal's container with secrets)
    result = extract_patterns_remote.remote(html=test_html, template_name="test")
    print(f"Success: {result.get('success')}")
    if result.get('success'):
        print(f"Components: {len(result.get('components', []))}")
        for comp in result.get('components', []):
            print(f"  - {comp.get('category')}: {comp.get('name')}")
        print(f"Colors: {result.get('colors', [])}")
        print(f"Cost: ${result.get('usage', {}).get('cost_usd', 0)}")
    else:
        print(f"Error: {result.get('error')}")
