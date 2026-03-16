import { SymphonyError } from '../errors.js';
import { create_codex_cli_runner_run } from './codex-cli.js';

export function create_default_runner_factory() {
    return (issue, attempt, workspace, prompt_template, config, tracker, workspace_manager, logger, on_event) => {
        switch (config.execution.runner) {
            case 'codex-cli':
                return create_codex_cli_runner_run(issue, attempt, workspace, prompt_template, config, tracker, workspace_manager, logger, on_event);
            default:
                throw new SymphonyError('unsupported_runner', `Unsupported Symphony runner: ${config.execution.runner}`);
        }
    };
}

export { create_codex_cli_runner_run } from './codex-cli.js';
