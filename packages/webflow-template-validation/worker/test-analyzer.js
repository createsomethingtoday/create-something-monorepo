/**
 * Test Result Analyzer and Advanced Reporting
 * Provides detailed analysis of test suite results
 */

const fs = require('fs').promises;
const path = require('path');

class TestResultAnalyzer {
    constructor(resultsData) {
        this.data = resultsData;
        this.analysis = {};
    }

    async analyzeResults() {
        console.log('🔍 Analyzing test results...\n');

        this.analysis = {
            overview: this.analyzeOverview(),
            performance: this.analyzePerformance(),
            validation: this.analyzeValidation(),
            reliability: this.analyzeReliability(),
            patterns: this.identifyPatterns(),
            recommendations: this.generateRecommendations()
        };

        return this.analysis;
    }

    analyzeOverview() {
        const results = this.data.results || [];
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        return {
            totalTests: results.length,
            successCount: successful.length,
            failureCount: failed.length,
            successRate: (successful.length / results.length * 100).toFixed(2),
            totalDuration: this.data.metadata?.duration || 0,
            averageTestTime: successful.length > 0 ?
                Math.round(successful.reduce((sum, r) => sum + r.duration, 0) / successful.length) : 0
        };
    }

    analyzePerformance() {
        const successful = this.data.results?.filter(r => r.success) || [];
        if (successful.length === 0) return { noData: true };

        const durations = successful.map(r => r.duration).sort((a, b) => a - b);
        const totalDuration = durations.reduce((sum, d) => sum + d, 0);

        return {
            averageResponseTime: Math.round(totalDuration / durations.length),
            medianResponseTime: durations[Math.floor(durations.length / 2)],
            fastestResponse: durations[0],
            slowestResponse: durations[durations.length - 1],
            p95ResponseTime: durations[Math.floor(durations.length * 0.95)],
            p99ResponseTime: durations[Math.floor(durations.length * 0.99)],
            timeoutRate: (this.data.summary?.timeouts || 0) / this.data.results.length * 100,
            distribution: this.analyzeResponseTimeDistribution(durations)
        };
    }

    analyzeResponseTimeDistribution(durations) {
        const buckets = {
            'under_5s': durations.filter(d => d < 5000).length,
            '5s_to_10s': durations.filter(d => d >= 5000 && d < 10000).length,
            '10s_to_20s': durations.filter(d => d >= 10000 && d < 20000).length,
            '20s_to_30s': durations.filter(d => d >= 20000 && d < 30000).length,
            'over_30s': durations.filter(d => d >= 30000).length
        };

        const total = durations.length;
        return Object.fromEntries(
            Object.entries(buckets).map(([key, count]) => [
                key,
                { count, percentage: (count / total * 100).toFixed(1) }
            ])
        );
    }

    analyzeValidation() {
        const successful = this.data.results?.filter(r => r.success) || [];
        if (successful.length === 0) return { noData: true };

        const validations = successful.map(r => r.validation).filter(v => v);
        const totalIssues = validations.reduce((sum, v) => sum + (v.totalIssues || 0), 0);
        const totalCritical = validations.reduce((sum, v) => sum + (v.criticalErrors || 0), 0);

        const categoryTotals = validations.reduce((acc, v) => {
            if (v.categories) {
                acc.assets += v.categories.assets || 0;
                acc.content += v.categories.content || 0;
                acc.performance += v.categories.performance || 0;
                acc.accessibility += v.categories.accessibility || 0;
            }
            return acc;
        }, { assets: 0, content: 0, performance: 0, accessibility: 0 });

        return {
            totalSitesAnalyzed: validations.length,
            totalIssuesFound: totalIssues,
            totalCriticalErrors: totalCritical,
            averageIssuesPerSite: (totalIssues / validations.length).toFixed(1),
            averageCriticalPerSite: (totalCritical / validations.length).toFixed(1),
            sitesWithIssues: validations.filter(v => (v.totalIssues || 0) > 0).length,
            sitesWithCriticalErrors: validations.filter(v => (v.criticalErrors || 0) > 0).length,
            categoryBreakdown: {
                assets: {
                    total: categoryTotals.assets,
                    average: (categoryTotals.assets / validations.length).toFixed(1),
                    percentage: (categoryTotals.assets / totalIssues * 100).toFixed(1)
                },
                content: {
                    total: categoryTotals.content,
                    average: (categoryTotals.content / validations.length).toFixed(1),
                    percentage: (categoryTotals.content / totalIssues * 100).toFixed(1)
                },
                performance: {
                    total: categoryTotals.performance,
                    average: (categoryTotals.performance / validations.length).toFixed(1),
                    percentage: (categoryTotals.performance / totalIssues * 100).toFixed(1)
                },
                accessibility: {
                    total: categoryTotals.accessibility,
                    average: (categoryTotals.accessibility / validations.length).toFixed(1),
                    percentage: (categoryTotals.accessibility / totalIssues * 100).toFixed(1)
                }
            }
        };
    }

    analyzeReliability() {
        const results = this.data.results || [];
        const errorTypes = {};
        const failurePatterns = {};

        results.filter(r => !r.success).forEach(result => {
            const error = result.error || 'Unknown error';
            errorTypes[error] = (errorTypes[error] || 0) + 1;

            // Identify patterns in failures
            if (error.includes('timeout') || error.includes('Timeout')) {
                failurePatterns.timeout = (failurePatterns.timeout || 0) + 1;
            } else if (error.includes('HTTP')) {
                failurePatterns.http_error = (failurePatterns.http_error || 0) + 1;
            } else if (error.includes('fetch') || error.includes('network')) {
                failurePatterns.network_error = (failurePatterns.network_error || 0) + 1;
            } else {
                failurePatterns.other = (failurePatterns.other || 0) + 1;
            }
        });

        return {
            overallReliability: (this.data.summary?.successful / results.length * 100).toFixed(2),
            errorDistribution: errorTypes,
            failurePatterns,
            stabilityScore: this.calculateStabilityScore(),
            retryRecommendation: this.shouldRecommendRetry()
        };
    }

    calculateStabilityScore() {
        const results = this.data.results || [];
        const total = results.length;
        const successful = results.filter(r => r.success).length;
        const timeouts = this.data.summary?.timeouts || 0;
        const errors = this.data.summary?.errors || 0;

        // Base score from success rate
        let score = (successful / total) * 70;

        // Penalty for timeouts (indicates worker overload)
        score -= (timeouts / total) * 20;

        // Penalty for errors (indicates code/configuration issues)
        score -= (errors / total) * 30;

        return Math.max(0, Math.round(score));
    }

    shouldRecommendRetry() {
        const timeoutRate = (this.data.summary?.timeouts || 0) / this.data.results.length;
        const errorRate = (this.data.summary?.errors || 0) / this.data.results.length;

        return {
            recommended: timeoutRate > 0.1 || errorRate > 0.05,
            reason: timeoutRate > 0.1 ? 'High timeout rate suggests worker overload' :
                   errorRate > 0.05 ? 'High error rate suggests configuration issues' :
                   'Good stability, no retry needed'
        };
    }

    identifyPatterns() {
        const results = this.data.results || [];
        const successful = results.filter(r => r.success);

        // URL patterns
        const domainPatterns = {};
        results.forEach(result => {
            try {
                const domain = new URL(result.siteUrl).hostname;
                const pattern = domain.replace(/^[^.]+/, '*'); // Replace subdomain with *
                domainPatterns[pattern] = domainPatterns[pattern] || { total: 0, successful: 0 };
                domainPatterns[pattern].total++;
                if (result.success) domainPatterns[pattern].successful++;
            } catch (e) {
                // Invalid URL, skip
            }
        });

        // Issue severity patterns
        const severityPatterns = {};
        successful.forEach(result => {
            if (result.validation) {
                const critical = result.validation.criticalErrors || 0;
                const total = result.validation.totalIssues || 0;
                const severity = critical > 5 ? 'high' : critical > 0 ? 'medium' : 'low';
                severityPatterns[severity] = (severityPatterns[severity] || 0) + 1;
            }
        });

        return {
            domainReliability: Object.fromEntries(
                Object.entries(domainPatterns).map(([pattern, data]) => [
                    pattern,
                    {
                        successRate: (data.successful / data.total * 100).toFixed(1),
                        sampleSize: data.total
                    }
                ])
            ),
            issuesDistribution: severityPatterns
        };
    }

    generateRecommendations() {
        const recommendations = [];
        const overview = this.analysis.overview || this.analyzeOverview();
        const performance = this.analysis.performance || this.analyzePerformance();
        const reliability = this.analysis.reliability || this.analyzeReliability();

        // Success rate recommendations
        if (parseFloat(overview.successRate) < 95) {
            recommendations.push({
                type: 'reliability',
                priority: 'high',
                title: 'Improve Success Rate',
                description: `Current success rate is ${overview.successRate}%. Target should be >95%.`,
                actions: [
                    'Investigate timeout and error causes',
                    'Consider increasing worker timeout limits',
                    'Add retry logic for transient failures',
                    'Optimize worker performance'
                ]
            });
        }

        // Performance recommendations
        if (performance.averageResponseTime > 15000) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                title: 'Optimize Response Times',
                description: `Average response time is ${performance.averageResponseTime}ms. Consider optimization.`,
                actions: [
                    'Implement parallel page processing',
                    'Add caching for repeated validations',
                    'Optimize HTML parsing logic',
                    'Consider breaking large sites into chunks'
                ]
            });
        }

        // Timeout recommendations
        if (performance.timeoutRate > 10) {
            recommendations.push({
                type: 'configuration',
                priority: 'high',
                title: 'Address Timeout Issues',
                description: `${performance.timeoutRate.toFixed(1)}% of requests are timing out.`,
                actions: [
                    'Increase worker timeout from 30s to 60s',
                    'Implement request batching',
                    'Add progress indicators',
                    'Consider async processing for large sites'
                ]
            });
        }

        // Validation recommendations
        const validation = this.analysis.validation || this.analyzeValidation();
        if (validation.averageIssuesPerSite > 20) {
            recommendations.push({
                type: 'validation',
                priority: 'low',
                title: 'Review Validation Sensitivity',
                description: `Average of ${validation.averageIssuesPerSite} issues per site may indicate overly strict validation.`,
                actions: [
                    'Review validation rules for false positives',
                    'Consider adjusting severity levels',
                    'Add configuration options for strictness',
                    'Implement smart filtering for common patterns'
                ]
            });
        }

        return recommendations;
    }

    async generateReport(outputPath) {
        await this.analyzeResults();

        const report = {
            title: 'Webflow Way Validator - Test Suite Analysis Report',
            generatedAt: new Date().toISOString(),
            summary: this.analysis.overview,
            sections: {
                performance: this.analysis.performance,
                validation: this.analysis.validation,
                reliability: this.analysis.reliability,
                patterns: this.analysis.patterns
            },
            recommendations: this.analysis.recommendations,
            rawData: this.data
        };

        // Save detailed JSON report
        const jsonPath = path.join(outputPath || '.', `test-analysis-${Date.now()}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

        // Generate human-readable report
        const readableReport = this.generateReadableReport();
        const txtPath = path.join(outputPath || '.', `test-report-${Date.now()}.txt`);
        await fs.writeFile(txtPath, readableReport);

        console.log(`📊 Analysis complete!`);
        console.log(`📄 Detailed report: ${jsonPath}`);
        console.log(`📋 Summary report: ${txtPath}`);

        return { jsonPath, txtPath, analysis: this.analysis };
    }

    generateReadableReport() {
        const overview = this.analysis.overview;
        const performance = this.analysis.performance;
        const validation = this.analysis.validation;
        const reliability = this.analysis.reliability;

        return `
WEBFLOW WAY VALIDATOR - TEST ANALYSIS REPORT
==========================================
Generated: ${new Date().toLocaleString()}

EXECUTIVE SUMMARY
-----------------
• Total Tests: ${overview.totalTests}
• Success Rate: ${overview.successRate}%
• Average Response Time: ${overview.averageTestTime}ms
• Stability Score: ${reliability.stabilityScore}/100

PERFORMANCE ANALYSIS
-------------------
• Average Response: ${performance.averageResponseTime}ms
• Median Response: ${performance.medianResponseTime}ms
• 95th Percentile: ${performance.p95ResponseTime}ms
• Fastest Response: ${performance.fastestResponse}ms
• Slowest Response: ${performance.slowestResponse}ms
• Timeout Rate: ${performance.timeoutRate.toFixed(1)}%

Response Time Distribution:
${Object.entries(performance.distribution)
    .map(([range, data]) => `  ${range.replace(/_/g, ' ')}: ${data.count} (${data.percentage}%)`)
    .join('\n')}

VALIDATION ANALYSIS
------------------
• Sites Analyzed: ${validation.totalSitesAnalyzed}
• Total Issues: ${validation.totalIssuesFound}
• Critical Errors: ${validation.totalCriticalErrors}
• Avg Issues/Site: ${validation.averageIssuesPerSite}
• Sites with Issues: ${validation.sitesWithIssues}

Issue Categories:
• Assets: ${validation.categoryBreakdown.assets.total} (${validation.categoryBreakdown.assets.percentage}%)
• Content: ${validation.categoryBreakdown.content.total} (${validation.categoryBreakdown.content.percentage}%)
• Performance: ${validation.categoryBreakdown.performance.total} (${validation.categoryBreakdown.performance.percentage}%)
• Accessibility: ${validation.categoryBreakdown.accessibility.total} (${validation.categoryBreakdown.accessibility.percentage}%)

RELIABILITY ANALYSIS
-------------------
• Overall Reliability: ${reliability.overallReliability}%
• Stability Score: ${reliability.stabilityScore}/100

Failure Patterns:
${Object.entries(reliability.failurePatterns)
    .map(([type, count]) => `  ${type.replace(/_/g, ' ')}: ${count}`)
    .join('\n')}

RECOMMENDATIONS
--------------
${this.analysis.recommendations.map(rec =>
`${rec.priority.toUpperCase()}: ${rec.title}
${rec.description}
Actions: ${rec.actions.map(a => `\n  • ${a}`).join('')}
`).join('\n')}

${this.analysis.recommendations.length === 0 ? 'No specific recommendations. System performing well!' : ''}

END OF REPORT
=============
`;
    }

    printQuickSummary() {
        const overview = this.analysis.overview || this.analyzeOverview();
        const reliability = this.analysis.reliability || this.analyzeReliability();

        console.log('📊 QUICK ANALYSIS SUMMARY');
        console.log('='.repeat(50));
        console.log(`Success Rate: ${overview.successRate}%`);
        console.log(`Avg Response: ${overview.averageTestTime}ms`);
        console.log(`Stability: ${reliability.stabilityScore}/100`);
        console.log(`Recommendations: ${this.analysis.recommendations?.length || 0}`);
        console.log('='.repeat(50));
    }
}

module.exports = TestResultAnalyzer;

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const resultsFile = args[0];

    if (!resultsFile) {
        console.log('Usage: node test-analyzer.js <results-file.json>');
        process.exit(1);
    }

    (async () => {
        try {
            const data = JSON.parse(await fs.readFile(resultsFile, 'utf8'));
            const analyzer = new TestResultAnalyzer(data);
            await analyzer.generateReport();
        } catch (error) {
            console.error('Analysis failed:', error.message);
            process.exit(1);
        }
    })();
}