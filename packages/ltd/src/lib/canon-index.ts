import type { Principle } from '$lib/types';

export interface PrincipleIndexRecord extends Principle {
  master_name: string;
  master_slug: string;
}

export interface PrincipleSourceGroup {
  id: string;
  name: string;
  slug: string;
  principles: PrincipleIndexRecord[];
}

export function groupPrinciplesByMaster(
  principles: readonly PrincipleIndexRecord[]
): PrincipleSourceGroup[] {
  const groups = new Map<string, PrincipleSourceGroup>();

  for (const principle of principles) {
    let group = groups.get(principle.master_id);
    if (!group) {
      group = {
        id: principle.master_id,
        name: principle.master_name,
        slug: principle.master_slug,
        principles: []
      };
      groups.set(principle.master_id, group);
    }
    group.principles.push(principle);
  }

  return [...groups.values()];
}
