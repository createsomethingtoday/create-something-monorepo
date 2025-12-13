"""
Subtractive Triad Reviewer - Hugging Face Space

Analyze code through the lens of disciplined removal:
- DRY: "Have I built this before?"
- Rams: "Does this earn its existence?"
- Heidegger: "Does this serve the whole?"
"""

import gradio as gr
from triad_audit import audit, format_report

# Example code for demonstration
EXAMPLE_CODE = '''"""
User management module
"""

import os
import sys
import json
import requests
import logging
from typing import Optional, Dict, List
from dataclasses import dataclass

# Configuration
API_URL = "https://api.example.com"
API_URL_BACKUP = "https://api.example.com"  # Duplicate!
TIMEOUT = 30
MAX_RETRIES = 3
DEFAULT_TIMEOUT = 30  # Same as TIMEOUT

@dataclass
class User:
    id: int
    name: str
    email: str

def get_user(user_id: int) -> Optional[User]:
    """Fetch a user by ID."""
    response = requests.get(f"{API_URL}/users/{user_id}", timeout=TIMEOUT)
    if response.status_code == 200:
        data = response.json()
        return User(id=data["id"], name=data["name"], email=data["email"])
    return None

def fetch_user(uid: int) -> Optional[User]:
    """Fetch a user by ID."""  # Almost identical to get_user!
    response = requests.get(f"{API_URL}/users/{uid}", timeout=TIMEOUT)
    if response.status_code == 200:
        data = response.json()
        return User(id=data["id"], name=data["name"], email=data["email"])
    return None

def GetAllUsers() -> List[User]:  # Wrong naming convention
    """Fetch all users."""
    response = requests.get(f"{API_URL}/users", timeout=TIMEOUT)
    return [User(**u) for u in response.json()]

def validate_email(email: str) -> bool:
    """Check if email is valid."""
    return "@" in email and "." in email

def helper_unused():
    """This function is never called."""
    pass

def another_unused():
    """Also never called."""
    ...

# Dead code below
if False:
    print("This never runs")
'''


def analyze_code(code: str) -> tuple[str, str, str, str, str]:
    """Run the Subtractive Triad audit and return formatted results."""
    if not code.strip():
        return "Please enter some code to analyze.", "", "", "", ""

    try:
        result = audit(code)
        report = format_report(result)

        # Format individual level results for the UI
        dry_summary = f"**Score: {result.dry.score}/10**\n\n"
        if result.dry.commendations:
            dry_summary += "**Commendations:**\n" + "\n".join(f"- {c}" for c in result.dry.commendations) + "\n\n"
        if result.dry.violations:
            dry_summary += "**Violations:**\n"
            for v in result.dry.violations:
                dry_summary += f"- [{v.severity.upper()}] {v.message}\n"
                if v.suggestion:
                    dry_summary += f"  *{v.suggestion}*\n"

        rams_summary = f"**Score: {result.rams.score}/10**\n\n"
        if result.rams.commendations:
            rams_summary += "**Commendations:**\n" + "\n".join(f"- {c}" for c in result.rams.commendations) + "\n\n"
        if result.rams.violations:
            rams_summary += "**Violations:**\n"
            for v in result.rams.violations:
                rams_summary += f"- [{v.severity.upper()}] {v.message}\n"
                if v.suggestion:
                    rams_summary += f"  *{v.suggestion}*\n"

        heidegger_summary = f"**Score: {result.heidegger.score}/10**\n\n"
        if result.heidegger.commendations:
            heidegger_summary += "**Commendations:**\n" + "\n".join(f"- {c}" for c in result.heidegger.commendations) + "\n\n"
        if result.heidegger.violations:
            heidegger_summary += "**Violations:**\n"
            for v in result.heidegger.violations:
                heidegger_summary += f"- [{v.severity.upper()}] {v.message}\n"
                if v.suggestion:
                    heidegger_summary += f"  *{v.suggestion}*\n"

        overall = f"# {result.overall_score}/10\n\n{result.summary}"

        return overall, dry_summary, rams_summary, heidegger_summary, report

    except Exception as e:
        return f"Error analyzing code: {str(e)}", "", "", "", ""


# Custom CSS for the interface
custom_css = """
.gradio-container {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.header-text {
    text-align: center;
    margin-bottom: 1rem;
}

.score-display {
    font-size: 2rem;
    font-weight: bold;
    text-align: center;
}

.level-box {
    border: 1px solid #333;
    border-radius: 8px;
    padding: 1rem;
    background: #0a0a0a;
}

footer {
    text-align: center;
    margin-top: 2rem;
    color: #666;
}
"""

# Build the Gradio interface
with gr.Blocks(css=custom_css, title="Subtractive Triad Reviewer", theme=gr.themes.Base(
    primary_hue="neutral",
    secondary_hue="neutral",
    neutral_hue="neutral",
)) as demo:

    gr.Markdown("""
    # Subtractive Triad Reviewer

    **Truth emerges through disciplined removal at every level of abstraction.**

    The Subtractive Triad applies one principle at three scales:

    | Level | Question | Action |
    |-------|----------|--------|
    | **DRY** | Have I built this before? | Unify |
    | **Rams** | Does this earn its existence? | Remove |
    | **Heidegger** | Does this serve the whole? | Reconnect |

    ---
    """)

    with gr.Row():
        with gr.Column(scale=1):
            code_input = gr.Code(
                label="Your Code (Python)",
                language="python",
                lines=25,
                value=EXAMPLE_CODE
            )
            analyze_btn = gr.Button("Analyze", variant="primary", size="lg")

        with gr.Column(scale=1):
            overall_output = gr.Markdown(label="Overall Score")

            with gr.Accordion("DRY - Implementation", open=True):
                gr.Markdown("*\"Have I built this before?\" - Eliminate duplication*")
                dry_output = gr.Markdown()

            with gr.Accordion("Rams - Artifact", open=True):
                gr.Markdown("*\"Does this earn its existence?\" - Weniger, aber besser*")
                rams_output = gr.Markdown()

            with gr.Accordion("Heidegger - System", open=True):
                gr.Markdown("*\"Does this serve the whole?\" - The hermeneutic circle*")
                heidegger_output = gr.Markdown()

    with gr.Accordion("Full Report (Markdown)", open=False):
        report_output = gr.Markdown()

    gr.Markdown("""
    ---

    ### The Philosophy

    This tool embodies the **Subtractive Triad** from [CREATE SOMETHING](https://createsomething.ltd):

    - **DRY** (Implementation): Technical discipline against redundancy
    - **Rams** (Artifact): Dieter Rams' principle - *Weniger, aber besser* (Less, but better)
    - **Heidegger** (System): The hermeneutic circle - parts must serve the whole

    The triad is coherent because it's one principle — **subtractive revelation** — applied at three scales.

    ---

    *Built by [CREATE SOMETHING](https://createsomething.ltd) | [.space](https://createsomething.space) | [.io](https://createsomething.io) | [.agency](https://createsomething.agency)*
    """)

    # Wire up the analysis
    analyze_btn.click(
        fn=analyze_code,
        inputs=[code_input],
        outputs=[overall_output, dry_output, rams_output, heidegger_output, report_output]
    )

    # Also analyze on load with example code
    demo.load(
        fn=analyze_code,
        inputs=[code_input],
        outputs=[overall_output, dry_output, rams_output, heidegger_output, report_output]
    )


if __name__ == "__main__":
    demo.launch()
