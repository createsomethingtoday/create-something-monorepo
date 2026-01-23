/**
 * GitHub History Commercial
 * 
 * Animated visualization of GitHub contribution history.
 * Real-time GraphQL data fetching with Vox-style aesthetics.
 */

export { GitHubHistoryCommercial, GITHUB_HISTORY_COMMERCIAL_CONFIG } from './GitHubHistoryCommercial';
export { SPEC as GITHUB_HISTORY_SPEC } from './spec';
export type { 
  GitHubContributionData, 
  ContributionCalendar, 
  ContributionWeek, 
  ContributionDay,
  RepositoryContribution,
  Repository,
} from './spec';

// Data utilities
export { fetchGitHubContributions, calculateStats, generateMockData } from './data/fetchGitHubData';

// Components
export { ContributionHeatmap, StatCounter } from './components';

// Scenes
export { IntroScene, HeatmapScene, StatsScene, CloseScene } from './scenes';
