import { parentPort, workerData } from "node:worker_threads";
import { Coordinator } from "./coordinator.mjs";
const c = new Coordinator(workerData.path, () =>
  Date.parse("2026-10-31T00:00:00Z"),
);
parentPort.postMessage("ready");
parentPort.once("message", () => {
  try {
    c.intake(workerData.actor, workerData.input);
    parentPort.postMessage("held");
  } catch (e) {
    parentPort.postMessage(e.message);
  } finally {
    c.close();
  }
});
