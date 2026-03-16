import { queue } from "@trigger.dev/sdk";

type TriggerQueue = ReturnType<typeof queue>;

export const triggerFoundationQueue: TriggerQueue = queue({
  name: "cs-trigger-foundation",
  concurrencyLimit: 1,
});

export const halfDozenReadOnlyQueue: TriggerQueue = queue({
  name: "cs-halfdozen-readonly",
  concurrencyLimit: 1,
});
