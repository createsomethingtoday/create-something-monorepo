export type AdminRequestErrorKind = 'unauthorized' | 'forbidden' | 'unavailable' | 'error';

export interface AdminRequestError {
	kind: AdminRequestErrorKind;
	status: number;
	message: string;
}

export type AdminRequestResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: AdminRequestError };

export async function fetchAdminJson<T>(
	input: string,
	init?: RequestInit
): Promise<AdminRequestResult<T>> {
	try {
		const response = await fetch(input, init);

		if (!response.ok) {
			return {
				ok: false,
				error: {
					kind: classifyAdminStatus(response.status),
					status: response.status,
					message: await readErrorMessage(response)
				}
			};
		}

		return {
			ok: true,
			data: (await response.json()) as T
		};
	} catch (error) {
		return {
			ok: false,
			error: {
				kind: 'error',
				status: 0,
				message: error instanceof Error ? error.message : 'Admin request failed'
			}
		};
	}
}

function classifyAdminStatus(status: number): AdminRequestErrorKind {
	if (status === 401) return 'unauthorized';
	if (status === 403) return 'forbidden';
	if (status >= 500) return 'unavailable';
	return 'error';
}

async function readErrorMessage(response: Response) {
	try {
		const payload = (await response.json()) as { error?: string; message?: string };
		return payload.error || payload.message || response.statusText || 'Admin request failed';
	} catch {
		return response.statusText || 'Admin request failed';
	}
}
