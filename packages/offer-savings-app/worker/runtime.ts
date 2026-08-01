import { McpAgent } from 'agents/mcp';
import { setDefaultOpenAIKey } from '@openai/agents';
import { createAgentOfferDiscoveryProvider } from '@create-something/offer-resolution/agent';
import {
  createOfferService,
  hashReceipt,
  type OfferService,
  type OfferWatch,
  type OfferWatchRepository
} from '@create-something/offer-resolution';
import { createOfferSavingsMcpServer } from '@create-something/offer-savings-app';

import {
  OFFER_SAVINGS_READ_SCOPE,
  OFFER_SAVINGS_WRITE_SCOPE,
  type OfferSavingsRequestProps,
  type OfferSavingsWorkerEnv
} from './contract.js';

interface StoredWatchRow {
  payload: string;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseWatch(row: StoredWatchRow | null): OfferWatch | undefined {
  return row ? (JSON.parse(row.payload) as OfferWatch) : undefined;
}

function createD1OfferWatchRepository(
  db: D1Database,
  ownerSubject: () => string | undefined
): OfferWatchRepository {
  const owner = () => {
    const subject = ownerSubject()?.trim();
    if (!subject) throw new Error('Authenticated Offer Savings identity is missing.');
    return subject;
  };

  return {
    async findByIdempotencyKey(key) {
      return parseWatch(
        await db
          .prepare(
            'SELECT payload FROM offer_watches WHERE owner_subject = ? AND idempotency_hash = ?'
          )
          .bind(owner(), hashReceipt({ scope: 'offer_watch', key }))
          .first<StoredWatchRow>()
      );
    },
    async get(id) {
      return parseWatch(
        await db
          .prepare('SELECT payload FROM offer_watches WHERE owner_subject = ? AND id = ?')
          .bind(owner(), id)
          .first<StoredWatchRow>()
      );
    },
    async list() {
      const result = await db
        .prepare('SELECT payload FROM offer_watches WHERE owner_subject = ? ORDER BY id')
        .bind(owner())
        .all<StoredWatchRow>();
      return result.results.map((row) => JSON.parse(row.payload) as OfferWatch);
    },
    async save(key, watch) {
      await db
        .prepare(
          `INSERT INTO offer_watches (owner_subject, id, idempotency_hash, payload, updated_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          owner(),
          watch.id,
          hashReceipt({ scope: 'offer_watch', key }),
          JSON.stringify(watch),
          watch.updatedAt
        )
        .run();
    },
    async update(watch) {
      const result = await db
        .prepare(
          `UPDATE offer_watches SET payload = ?, updated_at = ?
           WHERE owner_subject = ? AND id = ?`
        )
        .bind(JSON.stringify(watch), watch.updatedAt, owner(), watch.id)
        .run();
      if (!result.meta.changes) throw new Error(`Offer watch ${watch.id} does not exist.`);
    }
  };
}

function requireWriteScope(props: OfferSavingsRequestProps | undefined): void {
  if (!props?.scopes.includes(OFFER_SAVINGS_WRITE_SCOPE)) {
    throw new Error(`OAuth access token is missing ${OFFER_SAVINGS_WRITE_SCOPE}.`);
  }
}

export class OfferSavingsMCP extends McpAgent<
  OfferSavingsWorkerEnv,
  unknown,
  OfferSavingsRequestProps
> {
  private readonly offerService = this.createWorkerOfferService();

  server = createOfferSavingsMcpServer({
    service: this.offerService,
    readSecuritySchemes: [{ type: 'oauth2', scopes: [OFFER_SAVINGS_READ_SCOPE] }],
    writeSecuritySchemes: [
      {
        type: 'oauth2',
        scopes: [OFFER_SAVINGS_READ_SCOPE, OFFER_SAVINGS_WRITE_SCOPE]
      }
    ]
  });

  private createWorkerOfferService(): OfferService {
    const discovery = createAgentOfferDiscoveryProvider({
      model: this.env.OFFER_AGENT_MODEL?.trim() || 'gpt-5.4-mini',
      maxTurns: parsePositiveInteger(this.env.OFFER_AGENT_MAX_TURNS, 6)
    });
    const service = createOfferService({
      discovery,
      watches: createD1OfferWatchRepository(this.env.DB, () => this.props?.subject)
    });
    return {
      ...service,
      watchOffers: async (input) => {
        requireWriteScope(this.props);
        return service.watchOffers(input);
      }
    };
  }

  async init(): Promise<void> {
    const key = this.env.OPENAI_API_KEY?.trim();
    if (!key) throw new Error('OPENAI_API_KEY is required for Offer Savings discovery.');
    setDefaultOpenAIKey(key);
  }
}
