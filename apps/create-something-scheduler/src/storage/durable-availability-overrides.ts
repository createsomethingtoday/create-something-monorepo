import type {
  AvailabilityOverride,
  AvailabilityOverrideStore
} from '../application/booking-service.js';

const STORAGE_KEY = 'availability:overrides';

export class DurableAvailabilityOverrideStore implements AvailabilityOverrideStore {
  constructor(private readonly state: DurableObjectState) {}

  async list(): Promise<AvailabilityOverride[]> {
    const overrides = this.state.storage.kv.get<AvailabilityOverride[]>(STORAGE_KEY) ?? [];
    return overrides
      .map((override) => structuredClone(override))
      .sort((left, right) => `${left.date}:${left.opensAt}:${left.overrideId}`
        .localeCompare(`${right.date}:${right.opensAt}:${right.overrideId}`));
  }

  async upsert(override: AvailabilityOverride): Promise<void> {
    await this.state.blockConcurrencyWhile(async () => {
      const overrides = await this.list();
      const next = overrides.filter((candidate) => candidate.overrideId !== override.overrideId);
      next.push(structuredClone(override));
      this.state.storage.kv.put(STORAGE_KEY, next);
    });
  }

  async delete(overrideId: string): Promise<boolean> {
    return this.state.blockConcurrencyWhile(async () => {
      const overrides = await this.list();
      const next = overrides.filter((override) => override.overrideId !== overrideId);
      if (next.length === overrides.length) return false;
      this.state.storage.kv.put(STORAGE_KEY, next);
      return true;
    });
  }
}
