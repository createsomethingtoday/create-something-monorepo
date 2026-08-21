import {
	getOperatorPlaybook,
	OPERATOR_PLAYBOOKS,
	type OperatorPlaybook
} from '@create-something/playbook-mcp/operator-playbooks';

export type { OperatorPlaybook };
export const playbooks = OPERATOR_PLAYBOOKS;
export const getPlaybook = getOperatorPlaybook;
