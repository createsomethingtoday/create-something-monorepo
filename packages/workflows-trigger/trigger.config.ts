import { defineConfig } from "@trigger.dev/sdk";

const projectRef = process.env.TRIGGER_PROJECT_REF ?? "proj_local_placeholder";

if (!process.env.TRIGGER_PROJECT_REF) {
  console.warn(
    "[workflows-trigger] TRIGGER_PROJECT_REF is not set. Local typechecking will work, but dev/deploy commands require a real Trigger.dev project ref.",
  );
}

export default defineConfig({
  project: projectRef,
  runtime: "node-22",
  dirs: ["./trigger"],
  tsconfig: "./tsconfig.json",
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 10_000,
      factor: 2,
      randomize: true,
    },
  },
  maxDuration: 3_600,
});
