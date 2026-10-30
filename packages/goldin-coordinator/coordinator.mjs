import { DatabaseSync } from "node:sqlite";
import { CoordinatorCore } from "./core.mjs";
export { notionPlan } from "./core.mjs";
export class Coordinator extends CoordinatorCore {
  constructor(path, clock = Date.now) {
    const db = new DatabaseSync(path);
    db.exec("PRAGMA busy_timeout=5000");
    super(db, clock);
  }
}
