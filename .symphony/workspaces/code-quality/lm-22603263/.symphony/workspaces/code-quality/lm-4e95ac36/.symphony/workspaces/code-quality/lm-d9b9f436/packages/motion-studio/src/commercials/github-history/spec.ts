/**
 * GitHub History Commercial Specification
 * 
 * Timing, scene configuration, and constants for the GitHub History commercial.
 * Visualizes contribution heatmap animation for a GitHub account.
 */

export const SPEC = {
  // Video configuration
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 900, // 30 seconds
  
  // GitHub configuration
  github: {
    // GitHub username - default value, can be overridden via props
    username: 'createsomethingtoday',
    // Include private contributions (requires auth)
    includePrivate: true,
    // Years of history to show (GitHub API supports up to current year)
    yearsToShow: 1,
  },
  
  // Scene timing (in frames at 30fps)
  scenes: {
    intro: {
      start: 0,
      duration: 90, // 3s
      content: {
        title: 'A YEAR IN CODE',
        subtitle: 'github.com/',
      },
    },
    heatmap: {
      start: 90,
      duration: 600, // 20s - main visualization
      animationStyle: 'progressive', // 'progressive' | 'burst' | 'wave'
      cellDelay: 0.5, // frames between each cell appearing
    },
    stats: {
      start: 690,
      duration: 120, // 4s - extended for readability
      metrics: ['totalContributions', 'longestStreak', 'topLanguage'],
    },
    close: {
      start: 810,
      duration: 90, // 3s - extended for impact
      tagline: 'Every commit tells a story.',
      logo: 'CREATE SOMETHING',
    },
  },
  
  // Heatmap visual settings
  heatmap: {
    // Grid dimensions (GitHub standard: 53 weeks × 7 days)
    weeks: 53,
    daysPerWeek: 7,
    
    // Cell styling
    cellSize: 18,
    cellGap: 4,
    cellRadius: 3,
    
    // Monochrome intensity levels (0-4 contribution levels)
    // More dramatic contrast for visual impact
    levels: [
      '#0d0d0d', // 0 contributions - nearly black
      '#333333', // 1-3 contributions
      '#666666', // 4-6 contributions
      '#b3b3b3', // 7-9 contributions
      '#ffffff', // 10+ contributions - pure white
    ],
    
    // Busiest day highlight color
    busiestDayColor: '#ffffff',
    busiestDayGlow: '0 0 20px rgba(255, 255, 255, 0.6)',
    
    // Animation
    entranceType: 'fade-scale' as const,
    staggerDirection: 'left-right' as const, // 'left-right' | 'top-bottom' | 'diagonal' | 'random'
  },
  
  // Vox treatment settings
  voxTreatment: {
    posterizeFrameRate: 12, // Cutting on twos
    grainIntensity: 0.05,
    vignetteIntensity: 0.2,
    chromaticAberration: 0.6,
    backgroundTint: '#0a0a0a',
  },
  
  // Animation settings
  animation: {
    entranceDuration: 12,
    exitDuration: 10,
    holdDuration: 45,
    defaultEntrance: 'scale' as const,
    defaultExit: 'push-up' as const,
  },
} as const;

// Types for GitHub data
export interface ContributionDay {
  date: string;
  contributionCount: number;
  color: string;
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

export interface RepositoryContribution {
  repository: {
    name: string;
    nameWithOwner: string;
    isPrivate: boolean;
  };
  contributions: {
    totalCount: number;
  };
}

export interface Repository {
  name: string;
  isPrivate: boolean;
  primaryLanguage: {
    name: string;
    color: string;
  } | null;
}

export interface GitHubContributionData {
  user: {
    login: string;
    name: string | null;
    avatarUrl: string;
    contributionsCollection: {
      contributionCalendar: ContributionCalendar;
      restrictedContributionsCount: number;
      commitContributionsByRepository?: RepositoryContribution[];
    };
    repositories?: {
      nodes: Repository[];
    };
  };
}

export type GitHubHistorySpec = typeof SPEC;

export default SPEC;
