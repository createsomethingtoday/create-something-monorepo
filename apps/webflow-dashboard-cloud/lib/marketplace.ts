export function getCompetitionLevel(templateCount: number): string {
  if (templateCount < 10) return 'Low';
  if (templateCount < 30) return 'Medium';
  if (templateCount < 70) return 'High';
  return 'Very High';
}
