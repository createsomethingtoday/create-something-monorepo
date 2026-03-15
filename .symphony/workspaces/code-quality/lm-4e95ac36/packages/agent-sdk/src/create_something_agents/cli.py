#!/usr/bin/env python3
"""
CREATE SOMETHING Agent CLI

Simple command-line interface for local agent development.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path


def cmd_serve(args: argparse.Namespace) -> int:
    """Start the local agent server."""
    try:
        import uvicorn
    except ImportError:
        print("Error: uvicorn not installed. Run: pip install 'create-something-agents[server]'")
        return 1

    print(f"Starting agent server on http://localhost:{args.port}")
    print("Press Ctrl+C to stop\n")

    uvicorn.run(
        "server.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    """Run a task with an agent."""
    from create_something_agents import CreateSomethingAgent, AgentConfig

    async def execute():
        config = AgentConfig(
            task=args.task,
            model=args.model,
            skills=args.skills.split(",") if args.skills else [],
            max_turns=args.max_turns,
        )

        agent = CreateSomethingAgent(config)
        print(f"Running task with {config.model}...")
        print(f"Task: {config.task[:100]}{'...' if len(config.task) > 100 else ''}\n")

        result = await agent.run()

        print("\n" + "=" * 60)
        print(f"Success: {result.success}")
        print(f"Model: {result.model}")
        print(f"Iterations: {result.iterations}")
        print(f"Cost: ${result.cost_usd:.4f}")
        print("=" * 60)
        print(f"\nOutput:\n{result.output}")

        return 0 if result.success else 1

    return asyncio.run(execute())


def cmd_health(args: argparse.Namespace) -> int:
    """Check if the local server is running."""
    import httpx

    url = f"http://{args.host}:{args.port}/health"
    try:
        response = httpx.get(url, timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Server healthy: {url}")
            print(f"  Status: {data.get('status')}")
            print(f"  Timestamp: {data.get('timestamp')}")
            return 0
        else:
            print(f"✗ Server unhealthy: {response.status_code}")
            return 1
    except httpx.ConnectError:
        print(f"✗ Cannot connect to {url}")
        print("  Start server with: cs-agent serve")
        return 1


def cmd_test(args: argparse.Namespace) -> int:
    """Run the test suite."""
    import subprocess

    cmd = ["pytest", "tests/", "-v"]
    if args.coverage:
        cmd.extend(["--cov=src", "--cov-report=term-missing"])

    return subprocess.call(cmd)


def main() -> int:
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="cs-agent",
        description="CREATE SOMETHING Agent CLI - Local development tools",
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # serve command
    serve_parser = subparsers.add_parser("serve", help="Start the local agent server")
    serve_parser.add_argument("--host", default="127.0.0.1", help="Host to bind (default: 127.0.0.1)")
    serve_parser.add_argument("--port", type=int, default=8000, help="Port to bind (default: 8000)")
    serve_parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    serve_parser.set_defaults(func=cmd_serve)

    # run command
    run_parser = subparsers.add_parser("run", help="Run a task with an agent")
    run_parser.add_argument("task", help="Task description")
    run_parser.add_argument("--model", default="claude-sonnet-4-20250514", help="Model to use")
    run_parser.add_argument("--skills", help="Comma-separated list of skills")
    run_parser.add_argument("--max-turns", type=int, default=50, help="Maximum turns")
    run_parser.set_defaults(func=cmd_run)

    # health command
    health_parser = subparsers.add_parser("health", help="Check server health")
    health_parser.add_argument("--host", default="127.0.0.1", help="Server host")
    health_parser.add_argument("--port", type=int, default=8000, help="Server port")
    health_parser.set_defaults(func=cmd_health)

    # test command
    test_parser = subparsers.add_parser("test", help="Run the test suite")
    test_parser.add_argument("--coverage", action="store_true", help="Run with coverage")
    test_parser.set_defaults(func=cmd_test)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 0

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
