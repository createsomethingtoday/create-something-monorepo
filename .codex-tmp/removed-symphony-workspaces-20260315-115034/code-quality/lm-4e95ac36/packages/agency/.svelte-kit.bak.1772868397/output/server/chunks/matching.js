function calculateFitScore(request, talent) {
  const skillsScore = calculateSkillsMatch(request.required_skills || [], talent.skills);
  const budgetScore = calculateBudgetMatch(request.budget, talent.hourly_rate_min, talent.hourly_rate_max);
  const availabilityScore = calculateAvailabilityScore(talent.availability);
  const fitScore = Math.round(
    skillsScore * 0.4 + budgetScore * 0.3 + availabilityScore * 0.3
  );
  const fitBreakdown = {
    skills: Math.round(skillsScore),
    budget: Math.round(budgetScore),
    availability: Math.round(availabilityScore)
  };
  return {
    talent,
    fit_score: fitScore,
    fit_breakdown: fitBreakdown
  };
}
function calculateSkillsMatch(requiredSkills, talentSkills) {
  if (requiredSkills.length === 0) {
    return talentSkills.length > 0 ? 70 : 50;
  }
  const normalizedRequired = requiredSkills.map((s) => s.toLowerCase().trim());
  const normalizedTalent = talentSkills.map((s) => s.toLowerCase().trim());
  let matchCount = 0;
  for (const skill of normalizedRequired) {
    if (normalizedTalent.some((t) => t.includes(skill) || skill.includes(t))) {
      matchCount++;
    }
  }
  const matchRatio = matchCount / normalizedRequired.length;
  return 20 + matchRatio * 80;
}
function calculateBudgetMatch(budget, talentMin, talentMax) {
  if (!budget) return 70;
  if (!talentMin && !talentMax) return 70;
  const min = talentMin || 0;
  const max = talentMax || min * 2 || budget * 2;
  if (budget >= min && budget <= max) {
    return 100;
  }
  if (budget < min) {
    const ratio = budget / min;
    return Math.max(20, ratio * 80);
  }
  if (budget > max) {
    const ratio = max / budget;
    return Math.max(60, ratio * 100);
  }
  return 70;
}
function calculateAvailabilityScore(availability) {
  switch (availability) {
    case "available":
      return 100;
    case "busy":
      return 50;
    case "unavailable":
      return 10;
    default:
      return 50;
  }
}
function findMatches(request, talents, limit = 5) {
  const eligibleTalent = talents.filter(
    (t) => t.status === "active" && t.availability !== "unavailable"
  );
  const scored = eligibleTalent.map((talent) => calculateFitScore(request, talent));
  scored.sort((a, b) => b.fit_score - a.fit_score);
  return scored.slice(0, limit);
}
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}
function safeJsonParse(value, defaultValue, fieldName) {
  if (value === null || value === void 0) {
    return defaultValue;
  }
  try {
    const stringValue = typeof value === "string" ? value : String(value);
    return JSON.parse(stringValue);
  } catch (err) {
    console.error("JSON parse error:", {
      field: fieldName || "unknown",
      error: err instanceof Error ? err.message : String(err),
      valuePreview: String(value).substring(0, 100)
    });
    return defaultValue;
  }
}
export {
  findMatches as f,
  generateId as g,
  safeJsonParse as s
};
