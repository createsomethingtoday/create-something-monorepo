# CREATE SOMETHING Agent SDK - Local Development
# Run `make help` to see available commands

.PHONY: help install serve test run health clean

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install:  ## Install package with all dependencies
	pip install -e ".[all]"

serve:  ## Start local agent server (port 8000)
	uvicorn server.main:app --reload --port 8000

serve-prod:  ## Start server without reload
	uvicorn server.main:app --host 0.0.0.0 --port 8000

test:  ## Run tests
	pytest tests/ -v

test-cov:  ## Run tests with coverage
	pytest tests/ -v --cov=src --cov-report=term-missing

health:  ## Check if server is running
	@curl -s http://localhost:8000/health | python -m json.tool || echo "Server not running. Start with: make serve"

run:  ## Run a task (usage: make run TASK="your task here")
	@if [ -z "$(TASK)" ]; then echo "Usage: make run TASK=\"your task\""; exit 1; fi
	python -c "import asyncio; from create_something_agents import CreateSomethingAgent, AgentConfig; \
		async def main(): \
			agent = CreateSomethingAgent(AgentConfig(task='$(TASK)')); \
			result = await agent.run(); \
			print(f'Success: {result.success}\\nOutput: {result.output}'); \
		asyncio.run(main())"

lint:  ## Run linter
	ruff check src/ tests/

format:  ## Format code
	ruff format src/ tests/

typecheck:  ## Run type checker
	mypy src/

clean:  ## Clean up cache files
	rm -rf __pycache__ .pytest_cache .mypy_cache .ruff_cache
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
