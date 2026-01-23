/**
 * GitHub GraphQL Data Fetching
 * 
 * Fetches contribution data using GitHub's GraphQL API.
 * Requires GITHUB_TOKEN environment variable for authentication.
 */

import type { GitHubContributionData, ContributionCalendar } from '../spec';

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

/**
 * GraphQL query for contribution calendar and top repositories
 */
const CONTRIBUTIONS_QUERY = `
query($username: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $username) {
    login
    name
    avatarUrl
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            color
          }
        }
      }
      restrictedContributionsCount
      commitContributionsByRepository(maxRepositories: 5) {
        repository {
          name
          nameWithOwner
          isPrivate
        }
        contributions {
          totalCount
        }
      }
    }
    repositories(first: 3, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: OWNER) {
      nodes {
        name
        isPrivate
        primaryLanguage {
          name
          color
        }
      }
    }
  }
}
`;

/**
 * Fetch GitHub contribution data for a user
 */
export async function fetchGitHubContributions(
  username: string,
  options?: {
    from?: Date;
    to?: Date;
    token?: string;
  }
): Promise<GitHubContributionData> {
  // Access env via globalThis for browser/node compatibility
  const envToken = typeof globalThis !== 'undefined' 
    ? (globalThis as Record<string, unknown>).REMOTION_GITHUB_TOKEN as string | undefined
    : undefined;
  const token = options?.token || envToken;
  
  if (!token) {
    throw new Error(
      'GITHUB_TOKEN environment variable is required. ' +
      'Create a personal access token at https://github.com/settings/tokens'
    );
  }
  
  // Default to last year of contributions
  const to = options?.to || new Date();
  const from = options?.from || new Date(to.getFullYear() - 1, to.getMonth(), to.getDate());
  
  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: {
        username,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  
  const json = await response.json();
  
  if (json.errors) {
    throw new Error(`GraphQL error: ${json.errors.map((e: any) => e.message).join(', ')}`);
  }
  
  if (!json.data?.user) {
    throw new Error(`User not found: ${username}`);
  }
  
  return json.data as GitHubContributionData;
}

/**
 * Calculate statistics from contribution data
 */
export function calculateStats(calendar: ContributionCalendar) {
  const allDays = calendar.weeks.flatMap(w => w.contributionDays);
  
  // Total contributions (already provided)
  const totalContributions = calendar.totalContributions;
  
  // Calculate longest streak
  let currentStreak = 0;
  let longestStreak = 0;
  
  for (const day of allDays) {
    if (day.contributionCount > 0) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  // Calculate busiest day
  const busiestDay = allDays.reduce((max, day) => 
    day.contributionCount > max.contributionCount ? day : max
  , allDays[0]);
  
  // Calculate average contributions per day (non-zero days)
  const activeDays = allDays.filter(d => d.contributionCount > 0);
  const avgContributions = activeDays.length > 0 
    ? Math.round(activeDays.reduce((sum, d) => sum + d.contributionCount, 0) / activeDays.length)
    : 0;
  
  // Calculate contribution by day of week
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDayOfWeek = new Array(7).fill(0);
  allDays.forEach((day, index) => {
    const dayOfWeek = index % 7;
    byDayOfWeek[dayOfWeek] += day.contributionCount;
  });
  const mostActiveDay = dayNames[byDayOfWeek.indexOf(Math.max(...byDayOfWeek))];
  
  return {
    totalContributions,
    longestStreak,
    busiestDay,
    avgContributions,
    activeDays: activeDays.length,
    totalDays: allDays.length,
    mostActiveDay,
  };
}

/**
 * Generate mock data for development/testing
 * (when GitHub token is not available)
 */
export function generateMockData(username: string): GitHubContributionData {
  const weeks = [];
  const now = new Date();
  
  for (let w = 0; w < 53; w++) {
    const contributionDays = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - ((52 - w) * 7 + (6 - d)));
      
      // Generate pseudo-random contribution count
      // Higher probability of 0, occasional bursts
      const rand = Math.random();
      let count = 0;
      if (rand > 0.6) count = Math.floor(Math.random() * 5) + 1;
      if (rand > 0.9) count = Math.floor(Math.random() * 15) + 5;
      if (rand > 0.98) count = Math.floor(Math.random() * 30) + 10;
      
      // Skip weekends more often
      if ((d === 0 || d === 6) && Math.random() > 0.3) count = 0;
      
      contributionDays.push({
        date: date.toISOString().split('T')[0],
        contributionCount: count,
        color: count === 0 ? '#161b22' : 
               count < 4 ? '#0e4429' :
               count < 7 ? '#006d32' :
               count < 10 ? '#26a641' : '#39d353',
      });
    }
    weeks.push({ contributionDays });
  }
  
  return {
    user: {
      login: username,
      name: username,
      avatarUrl: `https://github.com/${username}.png`,
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: weeks.reduce((sum, w) => 
            sum + w.contributionDays.reduce((s, d) => s + d.contributionCount, 0), 0
          ),
          weeks,
        },
        restrictedContributionsCount: Math.floor(Math.random() * 500),
        commitContributionsByRepository: [
          { repository: { name: 'monorepo', nameWithOwner: `${username}/monorepo`, isPrivate: false }, contributions: { totalCount: 1200 } },
          { repository: { name: 'dashboard', nameWithOwner: `${username}/dashboard`, isPrivate: true }, contributions: { totalCount: 800 } },
          { repository: { name: 'api', nameWithOwner: `${username}/api`, isPrivate: false }, contributions: { totalCount: 450 } },
        ],
      },
      repositories: {
        nodes: [
          { name: 'monorepo', isPrivate: false, primaryLanguage: { name: 'TypeScript', color: '#3178c6' } },
          { name: 'dashboard', isPrivate: true, primaryLanguage: { name: 'Svelte', color: '#ff3e00' } },
          { name: 'api', isPrivate: false, primaryLanguage: { name: 'Python', color: '#3572A5' } },
        ],
      },
    },
  };
}
