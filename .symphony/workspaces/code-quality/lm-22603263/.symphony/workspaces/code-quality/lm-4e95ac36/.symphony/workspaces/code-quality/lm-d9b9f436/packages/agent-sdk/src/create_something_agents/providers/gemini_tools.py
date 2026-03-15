"""
Gemini Provider with Tool Support

Enhanced Gemini implementation with bash and file_read tools
for codebase-aware paper generation.

This enables Gemini to:
1. Search the codebase with bash (grep, find)
2. Read files to extract real examples
3. Ground papers in actual implementation details

MCP Note: Google's genai SDK supports MCP natively.
When MCP servers are available, pass ClientSession to tools parameter.
For now, we implement bash/file_read directly for paper generation.
"""

import os
import subprocess
from pathlib import Path
from typing import Any

from .base import AgentProvider, ProviderConfig, ProviderResult


# Tool definitions for Gemini function calling
BASH_TOOL_SCHEMA = {
    "name": "bash",
    "description": "Execute a bash command in the monorepo. Use for searching code (grep), listing files, or running simple commands. Do NOT use for destructive operations.",
    "parameters": {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "The bash command to execute. Examples: 'grep -r \"pattern\" packages/', 'find . -name \"*.ts\"', 'cat package.json'"
            }
        },
        "required": ["command"]
    }
}

FILE_READ_TOOL_SCHEMA = {
    "name": "file_read",
    "description": "Read the contents of a file. Use to examine source code, configuration files, or documentation.",
    "parameters": {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path to the file relative to monorepo root. Example: 'packages/io/src/routes/papers/haiku-optimization/+page.svelte'"
            },
            "start_line": {
                "type": "integer",
                "description": "Optional: Start reading from this line number (1-indexed)"
            },
            "end_line": {
                "type": "integer",
                "description": "Optional: Stop reading at this line number"
            }
        },
        "required": ["path"]
    }
}


# Allowlist for bash commands (safety)
ALLOWED_BASH_PREFIXES = [
    "grep", "rg", "find", "ls", "cat", "head", "tail", "wc",
    "tree", "file", "stat", "du", "pwd", "echo", "jq",
]

BLOCKED_PATTERNS = [
    "rm ", "mv ", "cp ", ">", ">>", "|", ";", "&&", "||",
    "sudo", "chmod", "chown", "curl", "wget", "ssh", "scp",
]


class GeminiToolsProvider(AgentProvider):
    """Gemini provider with bash and file_read tool support.

    Enables codebase-aware paper generation by allowing Gemini to:
    - Search for patterns in the codebase
    - Read actual source files
    - Extract real metrics and examples
    """

    name = "gemini-tools"

    def __init__(
        self,
        api_key: str | None = None,
        thinking_budget: int | None = None,
        working_dir: str | None = None,
        max_tool_calls: int = 20,
    ):
        """Initialize Gemini provider with tools.

        Args:
            api_key: Google API key. Falls back to GOOGLE_API_KEY env var.
            thinking_budget: Token budget for thinking (0-24576). Default: 8192.
            working_dir: Working directory for tool execution. Defaults to monorepo root.
            max_tool_calls: Maximum tool calls per execution. Default: 20.
        """
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY not set")

        self.thinking_budget = thinking_budget or 8192
        self.max_tool_calls = max_tool_calls

        # Determine working directory (monorepo root)
        if working_dir:
            self.working_dir = Path(working_dir)
        else:
            # Try to find monorepo root
            current = Path.cwd()
            while current != current.parent:
                if (current / "CLAUDE.md").exists() or (current / "pnpm-workspace.yaml").exists():
                    self.working_dir = current
                    break
                current = current.parent
            else:
                self.working_dir = Path.cwd()

        # Import google-genai
        try:
            from google import genai
            from google.genai import types
            self.genai = genai
            self.types = types
            self.client = genai.Client(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "google-genai not installed. "
                "Run: pip install 'create-something-agents[gemini]'"
            )

        # Build tool declarations
        self.tools = self._build_tools()

    def _build_tools(self) -> Any:
        """Build Gemini tool declarations."""
        bash_func = self.types.FunctionDeclaration(
            name=BASH_TOOL_SCHEMA["name"],
            description=BASH_TOOL_SCHEMA["description"],
            parameters=BASH_TOOL_SCHEMA["parameters"],
        )

        file_read_func = self.types.FunctionDeclaration(
            name=FILE_READ_TOOL_SCHEMA["name"],
            description=FILE_READ_TOOL_SCHEMA["description"],
            parameters=FILE_READ_TOOL_SCHEMA["parameters"],
        )

        return self.types.Tool(function_declarations=[bash_func, file_read_func])

    def _is_command_safe(self, command: str) -> tuple[bool, str]:
        """Check if a bash command is safe to execute."""
        command_lower = command.lower().strip()

        # Check blocked patterns
        for pattern in BLOCKED_PATTERNS:
            if pattern in command_lower:
                return False, f"Blocked pattern '{pattern}' found in command"

        # Check if starts with allowed prefix
        first_word = command_lower.split()[0] if command_lower else ""
        if first_word not in ALLOWED_BASH_PREFIXES:
            return False, f"Command '{first_word}' not in allowlist: {ALLOWED_BASH_PREFIXES}"

        return True, ""

    def _execute_bash(self, command: str) -> str:
        """Execute a bash command safely."""
        is_safe, reason = self._is_command_safe(command)
        if not is_safe:
            return f"Error: Command blocked for safety. {reason}"

        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30,
                cwd=self.working_dir,
            )

            output = result.stdout
            if result.stderr:
                output += f"\n[stderr]: {result.stderr}"

            # Truncate if too long
            if len(output) > 10000:
                output = output[:10000] + "\n... [truncated]"

            return output or "(no output)"

        except subprocess.TimeoutExpired:
            return "Error: Command timed out after 30 seconds"
        except Exception as e:
            return f"Error executing command: {str(e)}"

    def _execute_file_read(self, path: str, start_line: int | None = None, end_line: int | None = None) -> str:
        """Read a file from the working directory."""
        try:
            file_path = self.working_dir / path

            # Security: Ensure path is within working directory
            resolved = file_path.resolve()
            if not str(resolved).startswith(str(self.working_dir.resolve())):
                return "Error: Path escapes working directory"

            if not file_path.exists():
                return f"Error: File not found: {path}"

            if not file_path.is_file():
                return f"Error: Not a file: {path}"

            content = file_path.read_text()
            lines = content.split("\n")

            # Apply line range if specified
            if start_line is not None or end_line is not None:
                start = (start_line or 1) - 1  # Convert to 0-indexed
                end = end_line or len(lines)
                lines = lines[start:end]

            result = "\n".join(lines)

            # Truncate if too long
            if len(result) > 15000:
                result = result[:15000] + "\n... [truncated]"

            return result

        except Exception as e:
            return f"Error reading file: {str(e)}"

    def _execute_tool(self, name: str, args: dict) -> str:
        """Execute a tool call and return the result."""
        if name == "bash":
            return self._execute_bash(args.get("command", ""))
        elif name == "file_read":
            return self._execute_file_read(
                args.get("path", ""),
                args.get("start_line"),
                args.get("end_line"),
            )
        else:
            return f"Error: Unknown tool '{name}'"

    async def execute(self, config: ProviderConfig) -> ProviderResult:
        """Execute task with Gemini using tools.

        Implements an agentic loop:
        1. Send task to Gemini with tools
        2. If Gemini calls a tool, execute it and send result
        3. Repeat until Gemini produces final output or max iterations
        """
        model_name = "gemini-2.5-flash"  # Use thinking model for tool use

        total_input_tokens = 0
        total_output_tokens = 0
        total_thinking_tokens = 0
        tool_calls_log: list[dict[str, Any]] = []

        try:
            # Build initial config
            gen_config_kwargs: dict[str, Any] = {
                "max_output_tokens": config.max_tokens or 8192,
                "temperature": config.temperature or 0.0,
            }

            if config.system_prompt:
                gen_config_kwargs["system_instruction"] = config.system_prompt

            # Enable thinking
            gen_config_kwargs["thinking_config"] = self.types.ThinkingConfig(
                thinking_budget=self.thinking_budget
            )

            gen_config = self.types.GenerateContentConfig(
                tools=[self.tools],
                **gen_config_kwargs,
            )

            # Start conversation
            contents = [config.task]

            for iteration in range(self.max_tool_calls + 1):
                # Generate response
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=gen_config,
                )

                # Track tokens
                if hasattr(response, "usage_metadata") and response.usage_metadata:
                    total_input_tokens += getattr(response.usage_metadata, "prompt_token_count", 0) or 0
                    total_output_tokens += getattr(response.usage_metadata, "candidates_token_count", 0) or 0
                    total_thinking_tokens += getattr(response.usage_metadata, "thoughts_token_count", 0) or 0

                # Check for function calls
                has_function_call = False
                function_responses = []

                if response.candidates and response.candidates[0].content:
                    for part in response.candidates[0].content.parts:
                        if hasattr(part, "function_call") and part.function_call:
                            has_function_call = True
                            fc = part.function_call

                            # Execute the tool
                            tool_result = self._execute_tool(fc.name, dict(fc.args))

                            tool_calls_log.append({
                                "name": fc.name,
                                "args": dict(fc.args),
                                "result_preview": tool_result[:200] + "..." if len(tool_result) > 200 else tool_result,
                            })

                            # Build function response
                            function_responses.append(
                                self.types.Part.from_function_response(
                                    name=fc.name,
                                    response={"result": tool_result},
                                )
                            )

                if has_function_call and function_responses:
                    # Add model's response and our function results to conversation
                    contents.append(response.candidates[0].content)
                    contents.append(self.types.Content(parts=function_responses))
                else:
                    # No function call - extract final output
                    output = ""
                    thinking_output = ""

                    if response.candidates and response.candidates[0].content:
                        for part in response.candidates[0].content.parts:
                            if hasattr(part, "thought") and part.thought:
                                thinking_output += part.text + "\n"
                            elif hasattr(part, "text") and part.text:
                                output += part.text

                    if not output and response.text:
                        output = response.text

                    # Calculate cost
                    cost = self._calculate_cost(
                        total_input_tokens,
                        total_output_tokens,
                        model_name,
                        total_thinking_tokens
                    )

                    return ProviderResult(
                        success=True,
                        output=output,
                        model=model_name,
                        provider=self.name,
                        input_tokens=total_input_tokens,
                        output_tokens=total_output_tokens,
                        cost_usd=cost,
                        tool_calls=tool_calls_log,
                        iterations=iteration + 1,
                        metadata={
                            "thinking_enabled": True,
                            "thinking_tokens": total_thinking_tokens,
                            "tool_calls_count": len(tool_calls_log),
                        },
                    )

            # Max iterations reached
            return ProviderResult(
                success=False,
                output="Max tool call iterations reached",
                model=model_name,
                provider=self.name,
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens,
                cost_usd=self._calculate_cost(total_input_tokens, total_output_tokens, model_name, total_thinking_tokens),
                tool_calls=tool_calls_log,
                iterations=self.max_tool_calls,
                error="Max iterations reached",
            )

        except Exception as e:
            return ProviderResult(
                success=False,
                output="",
                model=model_name,
                provider=self.name,
                error=str(e),
                tool_calls=tool_calls_log,
            )

    def _calculate_cost(
        self,
        input_tokens: int,
        output_tokens: int,
        model: str,
        thinking_tokens: int = 0
    ) -> float:
        """Calculate cost including thinking tokens."""
        # Gemini 2.5 Flash costs (per 1M tokens)
        input_rate = 0.15
        output_rate = 0.60
        thinking_rate = 0.60

        input_cost = (input_tokens / 1_000_000) * input_rate
        output_cost = (output_tokens / 1_000_000) * output_rate
        thinking_cost = (thinking_tokens / 1_000_000) * thinking_rate

        return input_cost + output_cost + thinking_cost

    def estimate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        return self._calculate_cost(input_tokens, output_tokens, model, 0)

    def get_default_model(self, complexity: str) -> str:
        return "gemini-2.5-flash"

    @property
    def available_models(self) -> list[str]:
        return ["gemini-2.5-flash", "gemini-2.5-pro"]
