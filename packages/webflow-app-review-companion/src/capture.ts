export const ACTIVE_TAB_CAPTURE_GUIDANCE =
  "Chrome needs a one-tab screenshot grant. Keep the mission tab active, click the App Review Companion icon in Chrome's toolbar once, then select Complete again. The companion does not request access to every site.";

interface MaskedCaptureOptions {
  setMask: (enabled: boolean) => Promise<unknown>;
  capture: () => Promise<string>;
}

function isMissingActiveTabGrant(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Either the '<all_urls>' or 'activeTab' permission is required") ||
    message.includes('activeTab permission');
}

export async function captureMaskedVisibleTab({
  setMask,
  capture
}: MaskedCaptureOptions): Promise<string> {
  await setMask(true);
  try {
    return await capture();
  } catch (error) {
    if (isMissingActiveTabGrant(error)) {
      throw new Error(ACTIVE_TAB_CAPTURE_GUIDANCE);
    }
    throw error;
  } finally {
    await setMask(false).catch(() => undefined);
  }
}
