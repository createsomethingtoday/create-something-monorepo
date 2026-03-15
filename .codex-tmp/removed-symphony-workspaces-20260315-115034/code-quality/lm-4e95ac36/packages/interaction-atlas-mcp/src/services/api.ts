/**
 * Interaction Atlas — API Client
 *
 * Uses TokenProvider from AccountContext for authentication.
 * Never use vendor SDK for data operations — all data flows through
 * your own client, returning your own types.
 *
 * See sdk-auth-patterns.md: "Vendor SDK for Data Ops: Never"
 */

import type { TokenProvider } from '@create-something/mcp-core';

const BASE_URL = 'https://api.example.com/v1';

export class APIClient {
  private readonly tokenProvider: TokenProvider;

  constructor(tokenProvider: TokenProvider) {
    this.tokenProvider = tokenProvider;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.tokenProvider.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async get<T>(path: string): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${BASE_URL}${path}`, { headers });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}
