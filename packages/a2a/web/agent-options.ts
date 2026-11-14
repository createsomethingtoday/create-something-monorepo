export type AgentOption = { value: string; label: string };

type MembershipAgent = {
  id: string;
  name: string;
  paused: number;
  deleted_at: number | null;
};

/** Offer owned agents that can join without changing their raw identity labels. */
export function membershipOptions(
  agents: readonly MembershipAgent[],
  activeMemberIds: readonly string[]
): AgentOption[] {
  const activeIds = new Set(activeMemberIds);
  return agents
    .filter(
      (agent) => agent.paused === 0 && agent.deleted_at === null && !activeIds.has(agent.id)
    )
    .map((agent) => ({ value: agent.id, label: agent.name }));
}

/** Format a raw identity against the same raw choices used by native selects. */
export function agentLabel(
  id: string,
  options: AgentOption[],
  historicalName?: string
): string {
  const seen = new Set<string>();
  const choices = options.filter((option) => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
  const target = choices.findIndex((option) => option.value === id);
  // An unknown ID is evidence in its entirety; never shorten it into a name.
  if (target < 0 && historicalName === undefined) return id;
  if (target < 0) choices.push({ value: id, label: historicalName! });
  else if (historicalName !== undefined) choices[target] = { value: id, label: historicalName };
  return agentOptions(choices).find((option) => option.value === id)!.label;
}

/** Keep native choices readable while making identity visible before selection. */
export function agentOptions(options: AgentOption[]): AgentOption[] {
  const bases = options.map(({ label, value }) => {
    const text = label.trim() || value;
    const characters = Array.from(text);
    return characters.length > 40 ? characters.slice(0, 39).join('') + '…' : text;
  });
  const ids = [...new Set(options.map((o) => o.value).filter(Boolean))];
  let suffixLength = 8;
  const longest = Math.max(8, ...ids.map((id) => id.length));
  while (
    suffixLength < longest &&
    new Set(ids.map((id) => id.slice(-suffixLength))).size < ids.length
  )
    suffixLength++;
  const marked = new Set<number>();
  let labels = [...bases];
  // Include collisions with literal names resembling a generated label, too.
  while (true) {
    const newlyMarked = options.flatMap((option, index) =>
      option.value &&
      !marked.has(index) &&
      labels.some(
        (label, other) =>
          other !== index && label === labels[index] && options[other].value !== option.value
      )
        ? [index]
        : []
    );
    if (!newlyMarked.length) break;
    newlyMarked.forEach((index) => marked.add(index));
    labels = bases.map((base, index) =>
      marked.has(index) ? `${base} · ${options[index].value.slice(-suffixLength)}` : base
    );
  }
  return options.map((option, index) => ({ ...option, label: labels[index] }));
}
