/**
 * Sample Test Runner for Webflow Way Validator Worker
 * Tests with a smaller subset of URLs for quick validation
 */

// Use the same test suite class but with fewer URLs
const WORKER_URL = process.env.WORKER_URL || 'https://your-worker.your-subdomain.workers.dev';

// Smaller sample set for quick testing
const SAMPLE_URLS = [
    "https://webflow-way-validator-test-template.webflow.io/",
    "https://cleanslate-template.webflow.io/",
    "https://biznus-template.webflow.io/",
    "https://interplay-template.webflow.io/",
    "https://startup-landing-page-template.webflow.io/",
    "https://monteno-template.webflow.io/",
    "https://solstice-template.webflow.io/",
    "https://nourish-template.webflow.io/",
    "https://velocity-template.webflow.io/",
    "https://luxe-template.webflow.io/"
];

class SampleTestRunner {
    constructor() {
        this.results = [];
        this.startTime = null;
        this.endTime = null;
        this.stats = {
            total: 0,
            successful: 0,
            failed: 0,
            errors: 0,
            timeouts: 0
        };
    }

    async runSampleTests() {
        console.log(`🧪 Running sample test with ${SAMPLE_URLS.length} URLs`);
        console.log(`Worker URL: ${WORKER_URL}\n`);

        this.startTime = Date.now();

        // Test all URLs concurrently for faster sample testing
        const testPromises = SAMPLE_URLS.map(url => this.testURL(url));
        await Promise.allSettled(testPromises);

        this.endTime = Date.now();
        this.generateSampleReport();
    }

    async testURL(siteUrl) {
        const testResult = {
            siteUrl,
            timestamp: new Date().toISOString(),
            success: false,
            error: null,
            duration: 0,
            response: null,
            validation: {}
        };

        const startTime = Date.now();

        try {
            const requestPayload = {
                siteUrl,
                designerData: {
                    components: [],
                    styles: [],
                    pages: [],
                    assets: [],
                    siteInfo: {
                        name: `Sample Test - ${siteUrl.split('/')[2]}`,
                        id: `sample-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    }
                },
                options: {
                    maxPages: 5 // Even fewer pages for sample testing
                }
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'WebflowValidatorSampleTest/1.0'
                },
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            testResult.duration = Date.now() - startTime;

            if (response.ok) {
                const validationResult = await response.json();
                testResult.success = true;
                testResult.response = validationResult;
                testResult.validation = this.analyzeValidationResult(validationResult);

                this.stats.successful++;
                console.log(`✅ ${siteUrl} - ${testResult.duration}ms - ${testResult.validation.totalIssues} issues`);
            } else {
                testResult.error = `HTTP ${response.status}: ${response.statusText}`;
                this.stats.failed++;
                console.log(`❌ ${siteUrl} - HTTP ${response.status}`);
            }

        } catch (error) {
            testResult.duration = Date.now() - startTime;
            testResult.error = error.message;

            if (error.name === 'AbortError') {
                this.stats.timeouts++;
                console.log(`⏰ ${siteUrl} - Timeout`);
            } else {
                this.stats.errors++;
                console.log(`💥 ${siteUrl} - Error: ${error.message}`);
            }
        }

        this.stats.total++;
        this.results.push(testResult);
        return testResult;
    }

    analyzeValidationResult(result) {
        const analysis = {
            totalIssues: 0,
            criticalErrors: 0,
            categories: {
                assets: 0,
                content: 0,
                performance: 0,
                accessibility: 0
            }
        };

        if (result && result.analysis) {
            ['assets', 'content', 'performance', 'accessibility'].forEach(category => {
                if (result.analysis[category] && result.analysis[category].issues) {
                    const issues = result.analysis[category].issues;
                    analysis.categories[category] = issues.length;
                    analysis.totalIssues += issues.length;
                    analysis.criticalErrors += issues.filter(i => i.severity === 'error').length;
                }
            });
        }

        return analysis;
    }

    generateSampleReport() {
        const duration = this.endTime - this.startTime;
        const successRate = ((this.stats.successful / this.stats.total) * 100).toFixed(1);

        console.log('\n' + '='.repeat(60));
        console.log('🧪 SAMPLE TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`Duration: ${(duration / 1000).toFixed(1)}s | Success Rate: ${successRate}%`);
        console.log(`\nStats: ${this.stats.successful}/${this.stats.total} successful`);

        if (this.stats.failed > 0) console.log(`Failed: ${this.stats.failed}`);
        if (this.stats.errors > 0) console.log(`Errors: ${this.stats.errors}`);
        if (this.stats.timeouts > 0) console.log(`Timeouts: ${this.stats.timeouts}`);

        const successfulResults = this.results.filter(r => r.success);
        if (successfulResults.length > 0) {
            const avgIssues = (successfulResults.reduce((sum, r) => sum + r.validation.totalIssues, 0) / successfulResults.length).toFixed(1);
            const avgTime = Math.round(successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length);

            console.log(`\nValidation: ${avgIssues} avg issues, ${avgTime}ms avg response`);
        }

        console.log('\n✨ Sample test completed!');
        console.log('Use `npm run test:suite` to run the full 356 URL test');
        console.log('='.repeat(60));
    }
}

// Run sample test
const sampleRunner = new SampleTestRunner();
sampleRunner.runSampleTests().catch(console.error);