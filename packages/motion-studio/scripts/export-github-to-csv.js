#!/usr/bin/env node
/**
 * Export GitHub Contribution Data to CSV
 * 
 * Creates an Excel-friendly CSV with daily contribution data.
 * Run: node scripts/export-github-to-csv.js
 * 
 * Requires GITHUB_TOKEN environment variable.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const USERNAME = 'createsomethingtoday';

const CONTRIBUTIONS_QUERY = `
query($username: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $username) {
    login
    name
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            weekday
          }
        }
      }
      restrictedContributionsCount
      commitContributionsByRepository(maxRepositories: 10) {
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
  }
}
`;

async function fetchGitHubData(token) {
  const to = new Date();
  const from = new Date(to.getFullYear() - 1, to.getMonth(), to.getDate());
  
  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: {
        username: USERNAME,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  
  const json = await response.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${json.errors.map(e => e.message).join(', ')}`);
  }
  
  return json.data;
}

function generateCSV(data) {
  const { user } = data;
  const { contributionCalendar, restrictedContributionsCount, commitContributionsByRepository } = user.contributionsCollection;
  
  // Flatten all days
  const allDays = contributionCalendar.weeks.flatMap(w => w.contributionDays);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Calculate stats
  let longestStreak = 0;
  let currentStreak = 0;
  const byDayOfWeek = new Array(7).fill(0);
  
  allDays.forEach((day, index) => {
    if (day.contributionCount > 0) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    byDayOfWeek[day.weekday] += day.contributionCount;
  });
  
  const activeDays = allDays.filter(d => d.contributionCount > 0).length;
  const privateCount = restrictedContributionsCount;
  const calendarTotal = contributionCalendar.totalContributions;
  // Calendar total includes private if user has "show private" enabled
  // So public-only = calendar - private
  const publicOnly = calendarTotal;
  const grandTotal = calendarTotal + privateCount;
  
  // Build CSV
  let csv = '';
  
  // Summary section
  csv += 'GITHUB CONTRIBUTION SUMMARY\n';
  csv += `Username,${user.login}\n`;
  csv += `Name,${user.name || user.login}\n`;
  csv += `\n`;
  csv += 'KEY METRICS\n';
  csv += `Total Contributions,${grandTotal.toLocaleString()}\n`;
  csv += `Longest Streak (days),${longestStreak}\n`;
  csv += `Active Days,${activeDays}\n`;
  csv += `Total Days,${allDays.length}\n`;
  csv += `\n`;
  
  // By day of week
  csv += 'CONTRIBUTIONS BY DAY OF WEEK\n';
  csv += 'Day,Contributions\n';
  dayNames.forEach((name, i) => {
    csv += `${name},${byDayOfWeek[i]}\n`;
  });
  csv += `\n`;
  
  // Top repositories (public only)
  if (commitContributionsByRepository && commitContributionsByRepository.length > 0) {
    const publicRepos = commitContributionsByRepository.filter(repo => !repo.repository.isPrivate);
    if (publicRepos.length > 0) {
      csv += 'TOP PUBLIC REPOSITORIES\n';
      csv += 'Repository,Commits\n';
      publicRepos.forEach(repo => {
        csv += `${repo.repository.name},${repo.contributions.totalCount}\n`;
      });
      csv += `\n`;
    }
  }
  
  // Monthly breakdown
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const byMonth = {};
  allDays.forEach(day => {
    const date = new Date(day.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { contributions: 0, activeDays: 0, totalDays: 0 };
    byMonth[key].contributions += day.contributionCount;
    byMonth[key].totalDays++;
    if (day.contributionCount > 0) byMonth[key].activeDays++;
  });
  
  csv += 'MONTHLY BREAKDOWN\n';
  csv += 'Year-Month,Month,Year,Contributions,Active Days,Total Days,Avg Per Day,Activity Rate\n';
  Object.keys(byMonth).sort().forEach(key => {
    const [year, month] = key.split('-');
    const m = byMonth[key];
    const avgPerDay = (m.contributions / m.totalDays).toFixed(1);
    const activityRate = ((m.activeDays / m.totalDays) * 100).toFixed(1);
    csv += `${key},${monthNames[parseInt(month) - 1]},${year},${m.contributions},${m.activeDays},${m.totalDays},${avgPerDay},${activityRate}%\n`;
  });
  csv += `\n`;
  
  // Weekly breakdown
  const byWeek = {};
  allDays.forEach(day => {
    const date = new Date(day.date);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    const key = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    if (!byWeek[key]) byWeek[key] = { contributions: 0, activeDays: 0, peakDay: 0 };
    byWeek[key].contributions += day.contributionCount;
    if (day.contributionCount > 0) byWeek[key].activeDays++;
    byWeek[key].peakDay = Math.max(byWeek[key].peakDay, day.contributionCount);
  });
  
  csv += 'WEEKLY BREAKDOWN\n';
  csv += 'Year-Week,Contributions,Active Days,Peak Day,Avg Per Active Day\n';
  Object.keys(byWeek).sort().forEach(key => {
    const w = byWeek[key];
    const avgPerActive = w.activeDays > 0 ? (w.contributions / w.activeDays).toFixed(1) : '0';
    csv += `${key},${w.contributions},${w.activeDays},${w.peakDay},${avgPerActive}\n`;
  });
  csv += `\n`;
  
  // Contribution distribution (histogram data)
  const distribution = {};
  allDays.forEach(day => {
    const bucket = day.contributionCount === 0 ? '0' :
                   day.contributionCount <= 5 ? '1-5' :
                   day.contributionCount <= 10 ? '6-10' :
                   day.contributionCount <= 20 ? '11-20' :
                   day.contributionCount <= 50 ? '21-50' : '51+';
    distribution[bucket] = (distribution[bucket] || 0) + 1;
  });
  
  csv += 'CONTRIBUTION DISTRIBUTION\n';
  csv += 'Range,Days,Percentage\n';
  ['0', '1-5', '6-10', '11-20', '21-50', '51+'].forEach(bucket => {
    const count = distribution[bucket] || 0;
    const pct = ((count / allDays.length) * 100).toFixed(1);
    csv += `${bucket},${count},${pct}%\n`;
  });
  csv += `\n`;
  
  // Streak analysis
  const streaks = [];
  let streakStart = null;
  let streakLength = 0;
  allDays.forEach((day, i) => {
    if (day.contributionCount > 0) {
      if (!streakStart) streakStart = day.date;
      streakLength++;
    } else if (streakLength > 0) {
      streaks.push({ start: streakStart, length: streakLength, end: allDays[i-1].date });
      streakStart = null;
      streakLength = 0;
    }
  });
  if (streakLength > 0) {
    streaks.push({ start: streakStart, length: streakLength, end: allDays[allDays.length-1].date });
  }
  
  const topStreaks = streaks.sort((a, b) => b.length - a.length).slice(0, 10);
  csv += 'TOP 10 STREAKS\n';
  csv += 'Rank,Start Date,End Date,Days\n';
  topStreaks.forEach((s, i) => {
    csv += `${i + 1},${s.start},${s.end},${s.length}\n`;
  });
  csv += `\n`;
  
  // Daily data with rich dimensions
  csv += 'DAILY CONTRIBUTION DATA\n';
  csv += 'Date,Year,Month,Month Name,Quarter,Week Number,Day of Week,Day Name,Is Weekend,Contributions,7-Day Rolling Avg,30-Day Rolling Avg,Cumulative Total,Percentile Rank\n';
  
  // Calculate rolling averages and cumulative
  let cumulative = 0;
  const contributions = allDays.map(d => d.contributionCount);
  const sortedContributions = [...contributions].sort((a, b) => a - b);
  
  allDays.forEach((day, index) => {
    const date = new Date(day.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthName = monthNames[month - 1];
    const quarter = `Q${Math.ceil(month / 3)}`;
    const startOfYear = new Date(year, 0, 1);
    const weekNum = Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    const isWeekend = day.weekday === 0 || day.weekday === 6 ? 'Yes' : 'No';
    
    cumulative += day.contributionCount;
    
    // 7-day rolling average
    const start7 = Math.max(0, index - 6);
    const sum7 = contributions.slice(start7, index + 1).reduce((a, b) => a + b, 0);
    const avg7 = (sum7 / (index - start7 + 1)).toFixed(1);
    
    // 30-day rolling average
    const start30 = Math.max(0, index - 29);
    const sum30 = contributions.slice(start30, index + 1).reduce((a, b) => a + b, 0);
    const avg30 = (sum30 / (index - start30 + 1)).toFixed(1);
    
    // Percentile rank
    const rank = sortedContributions.filter(c => c <= day.contributionCount).length;
    const percentile = ((rank / sortedContributions.length) * 100).toFixed(0);
    
    csv += `${day.date},${year},${month},${monthName},${quarter},${weekNum},${day.weekday},${dayNames[day.weekday]},${isWeekend},${day.contributionCount},${avg7},${avg30},${cumulative},${percentile}\n`;
  });
  
  return csv;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    console.error('Error: GITHUB_TOKEN environment variable required');
    console.error('Create one at: https://github.com/settings/tokens');
    process.exit(1);
  }
  
  console.log(`Fetching GitHub data for ${USERNAME}...`);
  
  try {
    const data = await fetchGitHubData(token);
    const csv = generateCSV(data);
    
    const outputPath = path.join(__dirname, '..', 'github-contributions.csv');
    fs.writeFileSync(outputPath, csv);
    
    const total = data.user.contributionsCollection.contributionCalendar.totalContributions +
                  data.user.contributionsCollection.restrictedContributionsCount;
    
    console.log(`\n✓ Exported ${total.toLocaleString()} contributions to:`);
    console.log(`  ${outputPath}`);
    
    // Also generate a raw dump (public only, simple format)
    const rawCSV = generateRawDump(data);
    const rawPath = path.join(__dirname, '..', 'github-contributions-raw.csv');
    fs.writeFileSync(rawPath, rawCSV);
    console.log(`\n✓ Raw data dump (public repos only):`);
    console.log(`  ${rawPath}`);
    
    console.log(`\nOpen in Excel, Google Sheets, or Numbers!`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

/**
 * Generate a simple raw dump - just the data, no private info
 */
function generateRawDump(data) {
  const { user } = data;
  const { contributionCalendar, commitContributionsByRepository } = user.contributionsCollection;
  const allDays = contributionCalendar.weeks.flatMap(w => w.contributionDays);
  
  let csv = '';
  
  // Public repos only
  csv += 'PUBLIC REPOSITORY COMMITS\n';
  csv += 'repository,commits\n';
  const publicRepos = (commitContributionsByRepository || []).filter(r => !r.repository.isPrivate);
  publicRepos.forEach(repo => {
    csv += `${repo.repository.nameWithOwner},${repo.contributions.totalCount}\n`;
  });
  csv += `\n`;
  
  // Raw daily data - minimal columns
  csv += 'DAILY CONTRIBUTIONS (Calendar View)\n';
  csv += 'date,contributions\n';
  allDays.forEach(day => {
    csv += `${day.date},${day.contributionCount}\n`;
  });
  
  return csv;
}

main();
