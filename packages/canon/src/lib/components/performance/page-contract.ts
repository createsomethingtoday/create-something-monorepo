export const performancePageArchetypeBudgets = {
  landing: { minimum: 3, maximum: 5 },
  commercial: { minimum: 3, maximum: 4 },
  editorial: { minimum: 2, maximum: 4 },
  index: { minimum: 2, maximum: 3 },
  learning: { minimum: 2, maximum: 4 },
  tool: { minimum: 1, maximum: 3 }
} as const;

export type PerformancePageArchetype = keyof typeof performancePageArchetypeBudgets;

export type PerformancePageChapterRole =
  | 'opening'
  | 'orientation'
  | 'conditions'
  | 'sequence'
  | 'collection'
  | 'body'
  | 'workspace'
  | 'proof'
  | 'handoff';

export type PerformancePageChapter = {
  id: string;
  role: PerformancePageChapterRole;
  purpose: string;
};

export type PerformancePageContract = {
  id: string;
  archetype: PerformancePageArchetype;
  decision: string;
  chapters: PerformancePageChapter[];
  primaryProof: {
    chapterId: string;
    description: string;
  };
  handoff: {
    chapterId: string;
    action: string;
  };
};

export type PerformancePageRolloutStatus = 'pending' | 'migrated' | 'technical-exclusion';
export type PerformancePageTechnicalExclusionKind = 'callback' | 'redirect' | 'machine';

export type PerformancePageRegistryGroup<Property extends string = string> = {
  id: string;
  property: Property;
  sources: string[];
  status: PerformancePageRolloutStatus;
  contract?: Omit<PerformancePageContract, 'id'>;
  exclusion?: {
    kind: PerformancePageTechnicalExclusionKind;
    reason: string;
  };
};

export type PerformancePageContractValidation = {
  ok: boolean;
  errors: string[];
  budget: {
    minimum: number;
    maximum: number;
    actual: number;
  };
};

const introductionRoles = new Set<PerformancePageChapterRole>(['opening', 'orientation']);

export function validatePerformancePageContract(
  contract: PerformancePageContract
): PerformancePageContractValidation {
  const errors: string[] = [];
  const budgetDefinition = performancePageArchetypeBudgets[contract.archetype];
  const budget = {
    minimum: budgetDefinition.minimum,
    maximum: budgetDefinition.maximum,
    actual: contract.chapters.length
  };

  if (!contract.id.trim()) {
    errors.push('Performance page contracts require a stable id.');
  }

  if (!contract.decision.trim()) {
    errors.push(
      `${contract.id || 'Performance page'} requires one explicit reader or operator decision.`
    );
  }

  if (budget.actual < budget.minimum) {
    errors.push(
      `${contract.id} requires at least ${budget.minimum} ${contract.archetype} chapters; found ${budget.actual}.`
    );
  }

  if (budget.actual > budget.maximum) {
    errors.push(
      `${contract.id} exceeds the ${contract.archetype} chapter budget of ${budget.maximum} with ${budget.actual} chapters.`
    );
  }

  const introductionCount = contract.chapters.filter((chapter) =>
    introductionRoles.has(chapter.role)
  ).length;
  if (introductionCount > 1) {
    errors.push(
      `${contract.id} has ${introductionCount} introduction chapters; combine them into one opening or orientation.`
    );
  }

  const ids = new Set<string>();
  const purposes = new Set<string>();
  for (const chapter of contract.chapters) {
    if (!chapter.id.trim()) {
      errors.push(`${contract.id} has a chapter without a stable id.`);
    } else if (ids.has(chapter.id)) {
      errors.push(`${contract.id} repeats chapter id "${chapter.id}".`);
    }
    ids.add(chapter.id);

    const purpose = chapter.purpose.trim().toLocaleLowerCase();
    if (!purpose) {
      errors.push(`${contract.id} chapter "${chapter.id}" requires one communication purpose.`);
    } else if (purposes.has(purpose)) {
      errors.push(`${contract.id} repeats the chapter purpose "${chapter.purpose.trim()}".`);
    }
    purposes.add(purpose);
  }

  if (!ids.has(contract.primaryProof.chapterId)) {
    errors.push(
      `${contract.id} primary proof references unknown chapter "${contract.primaryProof.chapterId}".`
    );
  }
  if (!contract.primaryProof.description.trim()) {
    errors.push(`${contract.id} requires a named primary proof.`);
  }

  if (!ids.has(contract.handoff.chapterId)) {
    errors.push(
      `${contract.id} handoff references unknown chapter "${contract.handoff.chapterId}".`
    );
  }
  if (!contract.handoff.action.trim()) {
    errors.push(`${contract.id} requires one earned next action.`);
  }

  const proofIndex = contract.chapters.findIndex(
    (chapter) => chapter.id === contract.primaryProof.chapterId
  );
  const handoffIndex = contract.chapters.findIndex(
    (chapter) => chapter.id === contract.handoff.chapterId
  );
  if (proofIndex >= 0 && handoffIndex >= 0 && handoffIndex < proofIndex) {
    errors.push(`${contract.id} places its handoff before its primary proof.`);
  }

  return { ok: errors.length === 0, errors, budget };
}
