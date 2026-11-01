# Build the Agent Loop

## Outcome

Run a small agent-shaped program without an API key. It should observe an input, choose an action, record a receipt, and stop at a fixed budget. This is the control flow behind larger agent frameworks.

## Model the loop before adding a model

The basic cycle is **observe → decide → act → observe**. A model may choose the action later; first make the execution rules deterministic. This keeps the boundary visible when the model is wrong, unavailable, or asked to do too much.

Save this as `agent_loop.py` and run `python3 agent_loop.py`:

```python
from dataclasses import dataclass

@dataclass
class State:
    request: str
    observations: list[str]
    actions: list[str]

def decide(state: State) -> str:
    if not state.observations:
        return "read_source"
    if "source unavailable" in state.observations[-1]:
        return "stop_uncertain"
    if not state.actions or state.actions[-1] != "draft":
        return "draft"
    return "stop_review"

def act(action: str, state: State) -> str:
    if action == "read_source":
        return "source: authorized sample message asks for a meeting summary"
    if action == "draft":
        return "draft: Here is a meeting summary for human review."
    return action

def run(request: str, max_steps: int = 4) -> State:
    state = State(request, [], [])
    for _ in range(max_steps):
        action = decide(state)
        state.actions.append(action)
        observation = act(action, state)
        state.observations.append(observation)
        print(f"action={action}; observation={observation}")
        if action.startswith("stop_"):
            return state
    state.actions.append("stop_budget")
    return state

result = run("Summarize the message")
assert result.actions == ["read_source", "draft", "stop_review"]
```

The example has no network access and no send action. Its final state is a draft awaiting review. That is a useful result, not a defect.

## Change one thing

Make `read_source` return `source unavailable`, then run the program again. The desired actions are `read_source` and `stop_uncertain`. If it still drafts, the loop is inventing context.

Now compare this tiny loop with a real agent. A production loop adds typed tools, model decisions, source permissions, budgets, logs, and retries. The same stop logic must still be testable without asking the model to police itself.

## Receipt

In `LOOP_RECEIPT.md`, record the command, working directory, exit code, output for both runs, and the line that caused the uncertain run to stop. Keep the code too. A trace makes the mechanism explainable when a longer workflow fails at step 38.

## Go deeper

- [The Agent Loop](/reference/14-agent-engineering/01-the-agent-loop)
- [Tools and Protocols phase](/reference?phase=13-tools-and-protocols)
