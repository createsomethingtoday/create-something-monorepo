interface MissionTab {
  id?: number;
  url?: string;
}

type RequestOriginPermission = (permissions: {
  origins: string[];
}) => Promise<boolean>;

export async function requestMissionTarget(
  tab: MissionTab | undefined,
  requestPermission: RequestOriginPermission
): Promise<{ targetTabId: number }> {
  if (!tab?.id || !tab.url) {
    throw new Error('Open the Designer or published site tab first.');
  }

  const url = new URL(tab.url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Open the Designer or published site tab first.');
  }

  const granted = await requestPermission({ origins: [`${url.origin}/*`] });
  if (!granted) {
    throw new Error('This mission needs access to the current site only.');
  }

  return { targetTabId: tab.id };
}
