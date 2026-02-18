/**
 * Interaction Atlas — API Client
 *
 * Uses TokenProvider from AccountContext for authentication.
 * Never use vendor SDK for data operations — all data flows through
 * your own client, returning your own types.
 *
 * See sdk-auth-patterns.md: "Vendor SDK for Data Ops: Never"
 */
const BASE_URL = 'https://api.example.com/v1';
export class APIClient {
    tokenProvider;
    constructor(tokenProvider) {
        this.tokenProvider = tokenProvider;
    }
    async getHeaders() {
        const token = await this.tokenProvider.getAccessToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }
    async get(path) {
        const headers = await this.getHeaders();
        const response = await fetch(`${BASE_URL}${path}`, { headers });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    async post(path, body) {
        const headers = await this.getHeaders();
        const response = await fetch(`${BASE_URL}${path}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
}
//# sourceMappingURL=api.js.map