import type { RequestHandler } from './$types';
import { workspaceCommandResponse } from '$lib/workspace-api.js';

export const POST: RequestHandler = ({ request }) => workspaceCommandResponse(request);
