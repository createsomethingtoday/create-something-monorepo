"""
Tests for RLM (Recursive Language Model) Module

Tests the core RLM functionality without requiring API keys (unit tests)
and with API keys (integration tests).
"""

import pytest

import re

from create_something_agents.rlm.environment import RLMEnvironment, ExecutionResult


class TestFinalRegex:
    """Tests for the FINAL() answer extraction regex."""

    # The regex pattern used in session.py and modal_rlm.py
    FINAL_PATTERN = r"FINAL\((.+)\)\s*$"

    def test_simple_answer(self):
        """Test simple answer without parentheses."""
        text = "After analysis, the answer is:\nFINAL(The main theme is authentication)"
        match = re.search(self.FINAL_PATTERN, text, re.MULTILINE)
        assert match is not None
        assert match.group(1) == "The main theme is authentication"

    def test_nested_parentheses(self):
        """Test answer with nested parentheses (the key fix)."""
        text = "Based on findings:\nFINAL(The answer is (a) and (b) together)"
        match = re.search(self.FINAL_PATTERN, text, re.MULTILINE)
        assert match is not None
        assert match.group(1) == "The answer is (a) and (b) together"

    def test_multiple_nested_parens(self):
        """Test answer with multiple levels of parentheses."""
        text = "FINAL(Options include: (1) first, (2) second, and (3) third)"
        match = re.search(self.FINAL_PATTERN, text, re.MULTILINE)
        assert match is not None
        assert match.group(1) == "Options include: (1) first, (2) second, and (3) third"

    def test_final_with_trailing_whitespace(self):
        """Test FINAL() with trailing whitespace."""
        text = "FINAL(The answer)   \n"
        match = re.search(self.FINAL_PATTERN, text, re.MULTILINE)
        assert match is not None
        assert match.group(1) == "The answer"

    def test_final_var_pattern(self):
        """Test FINAL_VAR() pattern."""
        pattern = r"FINAL_VAR\((\w+)\)\s*$"
        text = "FINAL_VAR(results)"
        match = re.search(pattern, text, re.MULTILINE)
        assert match is not None
        assert match.group(1) == "results"


class TestRLMEnvironment:
    """Unit tests for RLMEnvironment (no API keys needed)."""

    def test_environment_creation_with_string(self):
        """Test creating environment with string context."""
        context = "This is a test document with some content."
        env = RLMEnvironment(context=context)

        info = env.context_info
        assert info["type"] == "string"
        assert info["total_chars"] == len(context)
        assert env.get_variable("context") == context

    def test_environment_creation_with_list(self):
        """Test creating environment with list context."""
        context = ["Document 1 content", "Document 2 content", "Document 3 content"]
        env = RLMEnvironment(context=context)

        info = env.context_info
        assert info["type"] == "list"
        assert info["num_items"] == 3

    def test_execute_simple_code(self):
        """Test executing simple Python code."""
        env = RLMEnvironment(context="Hello World")

        result = env.execute("print(len(context))")

        assert result.success is True
        assert "11" in result.output  # len("Hello World") = 11

    def test_execute_with_variable_assignment(self):
        """Test code that assigns variables."""
        env = RLMEnvironment(context="test")

        result = env.execute("x = 42\nprint(x)")

        assert result.success is True
        assert "42" in result.output
        assert env.get_variable("x") == 42

    def test_execute_with_results_dict(self):
        """Test using the results dictionary."""
        env = RLMEnvironment(context="test data")

        result = env.execute("""
results['finding1'] = 'Important discovery'
results['count'] = 5
print(results)
""")

        assert result.success is True
        results = env.get_variable("results")
        assert results["finding1"] == "Important discovery"
        assert results["count"] == 5

    def test_execute_with_regex(self):
        """Test regex operations on context."""
        context = """
Document 1: Authentication uses JWT tokens.
Document 2: Authorization is role-based.
Document 3: Authentication tokens expire in 24h.
"""
        env = RLMEnvironment(context=context)

        result = env.execute("""
import re
matches = re.findall(r'Document \\d+: (.*)', context)
for m in matches:
    print(m)
""")

        assert result.success is True
        assert "Authentication uses JWT tokens" in result.output
        assert "Authorization is role-based" in result.output

    def test_execute_with_chunking_helpers(self):
        """Test the built-in chunking helper functions."""
        context = "A" * 100
        env = RLMEnvironment(context=context)

        result = env.execute("""
chunks = chunk_text(context, 30)
print(f"Number of chunks: {len(chunks)}")
print(f"First chunk length: {len(chunks[0])}")
""")

        assert result.success is True
        assert "Number of chunks: 4" in result.output
        assert "First chunk length: 30" in result.output

    def test_execute_with_line_chunking(self):
        """Test line-based chunking."""
        context = "\n".join([f"Line {i}" for i in range(10)])
        env = RLMEnvironment(context=context)

        result = env.execute("""
chunks = chunk_lines(context, 3)
print(f"Number of chunks: {len(chunks)}")
""")

        assert result.success is True
        assert "Number of chunks: 4" in result.output

    def test_execute_handles_errors(self):
        """Test that execution errors are captured."""
        env = RLMEnvironment(context="test")

        result = env.execute("x = 1/0")

        assert result.success is False
        assert result.error is not None
        assert "ZeroDivisionError" in result.error

    def test_execute_handles_syntax_errors(self):
        """Test that syntax errors are captured."""
        env = RLMEnvironment(context="test")

        result = env.execute("def incomplete(")

        assert result.success is False
        assert result.error is not None
        assert "SyntaxError" in result.error

    def test_output_truncation(self):
        """Test that very long output is truncated."""
        env = RLMEnvironment(context="test", max_output_chars=100)

        result = env.execute("print('x' * 500)")

        assert result.success is True
        assert len(result.output) <= 150  # Some overhead for truncation message
        assert "truncated" in result.output.lower()

    def test_list_variables(self):
        """Test listing user-defined variables."""
        env = RLMEnvironment(context="test")
        env.execute("my_var = 123")
        env.execute("another_var = 'hello'")

        variables = env.list_variables()

        assert "my_var" in variables
        assert "another_var" in variables
        assert variables["my_var"] == "int"
        assert variables["another_var"] == "str"

    def test_mock_llm_query(self):
        """Test with a mock llm_query function."""

        def mock_llm_query(prompt: str) -> str:
            if "classify" in prompt.lower():
                return "Category: Technical Documentation"
            return "Generic response"

        env = RLMEnvironment(context="test doc", llm_query_fn=mock_llm_query)

        result = env.execute("""
response = llm_query("Please classify this document")
print(response)
""")

        assert result.success is True
        assert "Category: Technical Documentation" in result.output


class TestRLMEnvironmentLargeContext:
    """Tests for handling large contexts (simulated)."""

    def test_large_string_context(self):
        """Test with a large string context."""
        # 1MB of text
        context = "Test content. " * 100000
        env = RLMEnvironment(context=context)

        info = env.context_info
        assert info["total_chars"] > 1000000

        # Can still execute code
        result = env.execute("print(f'Context size: {len(context)}')")
        assert result.success is True

    def test_large_list_context(self):
        """Test with many documents."""
        context = [f"Document {i}: Content here" for i in range(1000)]
        env = RLMEnvironment(context=context)

        info = env.context_info
        assert info["num_items"] == 1000

        result = env.execute("print(f'Documents: {len(context)}')")
        assert result.success is True
        assert "Documents: 1000" in result.output


# Integration tests (require API keys)
@pytest.mark.integration
class TestRLMSessionIntegration:
    """Integration tests requiring API keys."""

    @pytest.mark.asyncio
    async def test_basic_rlm_session(self):
        """Test a basic RLM session."""
        import os

        if not os.environ.get("ANTHROPIC_API_KEY"):
            pytest.skip("ANTHROPIC_API_KEY not set")

        from create_something_agents.providers.claude import ClaudeProvider
        from create_something_agents.rlm import RLMSession, RLMConfig

        context = """
Document 1: User Authentication
- Uses JWT tokens
- Tokens expire in 24 hours
- Supports OAuth providers

Document 2: API Rate Limiting
- 100 requests per minute
- 429 status on exceeded
- Rate limit headers in response
"""

        provider = ClaudeProvider()
        config = RLMConfig(
            root_model="haiku",  # Use cheaper model for tests
            sub_model="haiku",
            max_iterations=5,
            max_sub_calls=3,
        )

        session = RLMSession(context=context, provider=provider, config=config)

        result = await session.run("What security features are mentioned?")

        assert result.iterations > 0
        # Should complete (success or max iterations)
        assert result.success or result.error == "Max iterations reached without final answer"


# Run with: pytest tests/test_rlm.py -v
# Integration tests: pytest tests/test_rlm.py -v -m integration
