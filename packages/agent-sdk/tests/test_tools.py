"""Tests for CREATE SOMETHING Agent tools."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

from create_something_agents.tools.bash import execute_bash
from create_something_agents.tools.files import execute_file_read, execute_file_write


class TestBashTool:
    """Tests for bash tool."""

    def test_simple_command(self) -> None:
        """Test basic command execution."""
        result = execute_bash("echo hello")
        assert result == "hello"

    def test_command_with_arguments(self) -> None:
        """Test command with arguments."""
        result = execute_bash("echo -n 'test value'")
        assert "test value" in result

    def test_failed_command(self) -> None:
        """Test command that fails."""
        result = execute_bash("exit 1")
        assert "[exit code: 1]" in result

    def test_nonexistent_command(self) -> None:
        """Test nonexistent command."""
        result = execute_bash("definitely_not_a_real_command_12345")
        # Should return error output, not crash
        assert "not found" in result.lower() or "exit code" in result.lower()

    def test_working_directory(self) -> None:
        """Test command runs in specified directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = execute_bash("pwd", cwd=tmpdir)
            assert tmpdir in result

    def test_timeout(self) -> None:
        """Test command timeout."""
        result = execute_bash("sleep 10", timeout=1)
        assert "timed out" in result.lower()

    def test_output_truncation(self) -> None:
        """Test large output is truncated."""
        # Generate output larger than 50KB
        result = execute_bash("python3 -c \"print('x' * 60000)\"")
        assert len(result) <= 51000  # Some buffer for the truncation message
        if len(result) > 50000:
            assert "Truncated" in result


class TestFileTool:
    """Tests for file read/write tools."""

    def test_read_file(self) -> None:
        """Test reading a file."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("test content\nline 2\n")
            f.flush()
            try:
                result = execute_file_read(f.name)
                assert "test content" in result
                assert "line 2" in result
            finally:
                os.unlink(f.name)

    def test_read_nonexistent_file(self) -> None:
        """Test reading a file that doesn't exist."""
        result = execute_file_read("/definitely/not/a/real/file.txt")
        assert "[Error:" in result
        assert "not found" in result.lower()

    def test_read_with_offset_and_limit(self) -> None:
        """Test reading with offset and limit."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("line 0\nline 1\nline 2\nline 3\nline 4\n")
            f.flush()
            try:
                # Read lines 2-3 (0-indexed)
                result = execute_file_read(f.name, offset=2, limit=2)
                assert "line 2" in result
                assert "line 3" in result
                assert "line 0" not in result
                assert "line 4" not in result
            finally:
                os.unlink(f.name)

    def test_write_file(self) -> None:
        """Test writing a file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test.txt")
            result = execute_file_write(path, "hello world")
            assert "Wrote" in result
            assert "11 bytes" in result

            # Verify content
            with open(path) as f:
                assert f.read() == "hello world"

    def test_write_creates_directories(self) -> None:
        """Test that write creates parent directories."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "a", "b", "c", "test.txt")
            result = execute_file_write(path, "nested content")
            assert "Wrote" in result
            assert Path(path).exists()

    def test_write_overwrites(self) -> None:
        """Test that write overwrites existing files."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("original content")
            f.flush()
            try:
                execute_file_write(f.name, "new content")
                with open(f.name) as rf:
                    assert rf.read() == "new content"
            finally:
                os.unlink(f.name)


class TestBeadsTool:
    """Tests for beads tool - requires bd CLI to be installed."""

    @pytest.mark.skip(reason="Requires bd CLI to be installed")
    def test_list_issues(self) -> None:
        """Test listing issues."""
        from create_something_agents.tools.beads import execute_beads

        result = execute_beads(action="list")
        # Should return JSON or empty list
        assert "[Error:" not in result or "not found" in result
