/**
 * GitHubHistoryCommercial - 30-second visualization of GitHub contribution history
 * 
 * Vox-style kinetic typography with real-time GitHub GraphQL data.
 * Animated contribution heatmap as the centerpiece.
 * 
 * Structure:
 * - Intro (0-3s): "A YEAR IN CODE" + username + avatar + year
 * - Heatmap (3-23s): Left-to-right wave reveal with busiest day highlight
 * - Stats (23-27s): Total contributions, streak, active days + private count
 * - Close (27-30s): Personalized count + tagline + logo
 */
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Sequence, delayRender, continueRender } from 'remotion';
import { VoxTreatment } from '../shared/primitives';
import { IntroScene, HeatmapScene, StatsScene, CloseScene } from './scenes';
import { fetchGitHubContributions, calculateStats, generateMockData } from './data/fetchGitHubData';
import { SPEC } from './spec';
import type { GitHubContributionData } from './spec';

interface GitHubHistoryCommercialProps {
  /** GitHub username to fetch data for */
  username?: string;
  /** Use mock data instead of real API (for development) */
  useMockData?: boolean;
  /** GitHub personal access token for API authentication */
  githubToken?: string;
}

export const GitHubHistoryCommercial: React.FC<GitHubHistoryCommercialProps> = ({
  username = SPEC.github.username,
  useMockData = false,
  githubToken,
}) => {
  const { scenes, voxTreatment } = SPEC;
  
  const [data, setData] = useState<GitHubContributionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handle] = useState(() => delayRender('Loading GitHub data...'));
  
  useEffect(() => {
    const loadData = async () => {
      try {
        let githubData: GitHubContributionData;
        
        if (useMockData || !githubToken) {
          // Use mock data for development or when no token provided
          githubData = generateMockData(username);
        } else {
          // Fetch real data from GitHub
          githubData = await fetchGitHubContributions(username, { token: githubToken });
        }
        
        setData(githubData);
        continueRender(handle);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to fetch GitHub data:', errorMessage);
        
        // Fall back to mock data on error
        console.log('Falling back to mock data...');
        const mockData = generateMockData(username);
        setData(mockData);
        setError(errorMessage);
        continueRender(handle);
      }
    };
    
    loadData();
  }, [username, useMockData, githubToken, handle]);
  
  // Show loading state until data is ready
  if (!data) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: voxTreatment.backgroundTint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          color: '#666',
        }}
      >
        Loading GitHub data...
      </AbsoluteFill>
    );
  }
  
  const { contributionCalendar, restrictedContributionsCount } = data.user.contributionsCollection;
  const stats = calculateStats(contributionCalendar);
  const displayUsername = data.user.login;
  const avatarUrl = data.user.avatarUrl;
  
  // Include private contributions in total if available
  const totalWithPrivate = stats.totalContributions + restrictedContributionsCount;
  
  // Calculate year range from contribution data
  const allDays = contributionCalendar.weeks.flatMap(w => w.contributionDays);
  const firstDate = allDays[0]?.date;
  const lastDate = allDays[allDays.length - 1]?.date;
  const startYear = firstDate ? new Date(firstDate).getFullYear() : new Date().getFullYear();
  const endYear = lastDate ? new Date(lastDate).getFullYear() : new Date().getFullYear();
  const yearRange = startYear === endYear ? `${startYear}` : `${startYear} - ${endYear}`;
  
  return (
    <VoxTreatment
      posterizeFrameRate={voxTreatment.posterizeFrameRate}
      grainIntensity={voxTreatment.grainIntensity}
      vignetteIntensity={voxTreatment.vignetteIntensity}
      chromaticAberration={voxTreatment.chromaticAberration}
      backgroundTint={voxTreatment.backgroundTint}
    >
      {/* Error indicator (subtle, bottom corner) */}
      {error && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#666',
            zIndex: 100,
          }}
        >
          [Mock data - API error]
        </div>
      )}
      
      {/* Intro: "A YEAR IN CODE" + username + avatar + year */}
      <Sequence
        from={scenes.intro.start}
        durationInFrames={scenes.intro.duration}
        name="Intro"
      >
        <IntroScene 
          username={displayUsername} 
          avatarUrl={avatarUrl}
          yearRange={yearRange}
        />
      </Sequence>
      
      {/* Heatmap: Main contribution visualization with busiest day highlight */}
      <Sequence
        from={scenes.heatmap.start}
        durationInFrames={scenes.heatmap.duration}
        name="Heatmap"
      >
        <HeatmapScene
          weeks={contributionCalendar.weeks}
          totalContributions={totalWithPrivate}
          username={displayUsername}
          busiestDay={stats.busiestDay}
          topRepos={data.user.contributionsCollection.commitContributionsByRepository}
        />
      </Sequence>
      
      {/* Stats: Key metrics display with private contributions */}
      <Sequence
        from={scenes.stats.start}
        durationInFrames={scenes.stats.duration}
        name="Stats"
      >
        <StatsScene
          stats={{
            ...stats,
            totalContributions: totalWithPrivate,
          }}
          privateContributions={restrictedContributionsCount}
        />
      </Sequence>
      
      {/* Close: Personalized count + tagline + logo */}
      <Sequence
        from={scenes.close.start}
        durationInFrames={scenes.close.duration}
        name="Close"
      >
        <CloseScene totalContributions={totalWithPrivate} />
      </Sequence>
    </VoxTreatment>
  );
};

export const GITHUB_HISTORY_COMMERCIAL_CONFIG = {
  id: 'GitHubHistoryCommercial',
  component: GitHubHistoryCommercial,
  durationInFrames: SPEC.durationInFrames,
  fps: SPEC.fps,
  width: SPEC.width,
  height: SPEC.height,
  defaultProps: {
    username: SPEC.github.username,
    useMockData: false,
  },
};

export default GitHubHistoryCommercial;
