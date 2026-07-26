import type {
  BusyProjection,
  BusyProjectionStore
} from '../providers/projected-calendar.js';

const WEBFLOW_PROJECTION_KEY = 'projection:webflow-google-calendar';

export class DurableBusyProjectionStore implements BusyProjectionStore {
  constructor(private readonly state: DurableObjectState) {}

  async read(): Promise<BusyProjection | null> {
    return this.state.storage.kv.get<BusyProjection>(WEBFLOW_PROJECTION_KEY) ?? null;
  }

  async write(projection: BusyProjection): Promise<void> {
    this.state.storage.kv.put(WEBFLOW_PROJECTION_KEY, projection);
  }
}
