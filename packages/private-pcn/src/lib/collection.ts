import { assetKinds, type AssetKind } from './assets';
/** Search only the acquired releases already authorized by the collection loader. */
export function filterCollection<
  T extends { title: string; kind: string; network_name: string; version: string }
>(items: T[], query: string, kind: string): T[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(
    (item) =>
      (!kind || item.kind === kind) &&
      terms.every((term) =>
        `${item.title} ${item.network_name} ${item.version} ${assetKinds[item.kind as AssetKind] || item.kind}`
          .toLocaleLowerCase()
          .includes(term)
      )
  );
}
