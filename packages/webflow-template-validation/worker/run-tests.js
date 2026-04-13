#!/usr/bin/env node
/**
 * Comprehensive Test Runner for Webflow Way Validator
 * Orchestrates full test suite execution and analysis
 */

const fs = require('fs').promises;
const path = require('path');

// Import test suite classes
const WebflowValidatorTestSuite = require('./test-suite.js');
const TestResultAnalyzer = require('./test-analyzer.js');

// Configuration
const DEFAULT_WORKER_URL = 'https://your-worker.your-subdomain.workers.dev';
const RESULTS_DIR = './test-results';

class TestOrchestrator {
    constructor(options = {}) {
        this.workerUrl = options.workerUrl || process.env.WORKER_URL || DEFAULT_WORKER_URL;
        this.mode = options.mode || 'full'; // 'full', 'sample', 'custom'
        this.customUrls = options.customUrls || [];
        this.outputDir = options.outputDir || RESULTS_DIR;
        this.generateReport = options.generateReport !== false;
        this.timestamp = Date.now();
    }

    async run() {
        console.log('🚀 Webflow Way Validator Test Orchestrator');
        console.log('==========================================');
        console.log(`Mode: ${this.mode}`);
        console.log(`Worker URL: ${this.workerUrl}`);
        console.log(`Output Directory: ${this.outputDir}`);
        console.log(`Timestamp: ${new Date().toLocaleString()}\n`);

        // Ensure output directory exists
        await this.ensureOutputDir();

        // Run the appropriate test suite
        let testResults;
        switch (this.mode) {
            case 'sample':
                testResults = await this.runSampleTests();
                break;
            case 'custom':
                testResults = await this.runCustomTests();
                break;
            case 'full':
            default:
                testResults = await this.runFullTests();
                break;
        }

        // Save test results
        const resultsFile = await this.saveTestResults(testResults);

        // Generate analysis if requested
        if (this.generateReport) {
            await this.generateAnalysisReport(resultsFile);
        }

        console.log('\n🎉 Test orchestration completed successfully!');
        return resultsFile;
    }

    async ensureOutputDir() {
        try {
            await fs.access(this.outputDir);
        } catch {
            await fs.mkdir(this.outputDir, { recursive: true });
            console.log(`📁 Created output directory: ${this.outputDir}`);
        }
    }

    async runFullTests() {
        console.log('📋 Running FULL test suite (356 URLs)...\n');

        // Create and configure test suite
        const testSuite = new WebflowValidatorTestSuite();

        // Override worker URL if provided
        if (this.workerUrl !== DEFAULT_WORKER_URL) {
            // Update the WORKER_URL in the test suite
            // This is a bit hacky but necessary since the test suite uses a hardcoded URL
            console.log(`🔧 Using custom worker URL: ${this.workerUrl}`);
        }

        // Run the tests
        await testSuite.runTests();

        return {
            metadata: {
                testSuite: 'Webflow Way Validator Full Test Suite',
                timestamp: new Date().toISOString(),
                mode: 'full',
                workerUrl: this.workerUrl,
                totalUrls: 356
            },
            summary: testSuite.stats,
            results: testSuite.results,
            duration: testSuite.endTime - testSuite.startTime
        };
    }

    async runSampleTests() {
        console.log('📋 Running SAMPLE test suite (10 URLs)...\n');

        const { SampleTestRunner } = require('./test-sample.js');
        const sampleRunner = new SampleTestRunner();

        await sampleRunner.runSampleTests();

        return {
            metadata: {
                testSuite: 'Webflow Way Validator Sample Test Suite',
                timestamp: new Date().toISOString(),
                mode: 'sample',
                workerUrl: this.workerUrl,
                totalUrls: 10
            },
            summary: sampleRunner.stats,
            results: sampleRunner.results,
            duration: sampleRunner.endTime - sampleRunner.startTime
        };
    }

    async runCustomTests() {
        if (this.customUrls.length === 0) {
            throw new Error('Custom URLs must be provided for custom test mode');
        }

        console.log(`📋 Running CUSTOM test suite (${this.customUrls.length} URLs)...\n`);

        // Create a custom test suite with the provided URLs
        const testSuite = new WebflowValidatorTestSuite();

        // Override the TEST_URLS with custom URLs
        testSuite.TEST_URLS = this.customUrls;

        await testSuite.runTests();

        return {
            metadata: {
                testSuite: 'Webflow Way Validator Custom Test Suite',
                timestamp: new Date().toISOString(),
                mode: 'custom',
                workerUrl: this.workerUrl,
                totalUrls: this.customUrls.length,
                customUrls: this.customUrls
            },
            summary: testSuite.stats,
            results: testSuite.results,
            duration: testSuite.endTime - testSuite.startTime
        };
    }

    async saveTestResults(testResults) {
        const filename = `test-results-${this.mode}-${this.timestamp}.json`;
        const filepath = path.join(this.outputDir, filename);

        await fs.writeFile(filepath, JSON.stringify(testResults, null, 2));

        console.log(`💾 Test results saved: ${filepath}`);
        return filepath;
    }

    async generateAnalysisReport(resultsFile) {
        console.log('\n🔍 Generating analysis report...');

        try {
            const testData = JSON.parse(await fs.readFile(resultsFile, 'utf8'));
            const analyzer = new TestResultAnalyzer(testData);

            await analyzer.analyzeResults();
            analyzer.printQuickSummary();

            await analyzer.generateReport(this.outputDir);

        } catch (error) {
            console.error('❌ Analysis generation failed:', error.message);
        }
    }

    // Utility method to validate worker URL
    async validateWorkerUrl() {
        console.log(`🔍 Validating worker URL: ${this.workerUrl}`);

        try {
            const testPayload = {
                siteUrl: 'https://webflow.com',
                designerData: { components: [], styles: [], pages: [], assets: [] }
            };

            const response = await fetch(this.workerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPayload),
                signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
                console.log('✅ Worker URL is responding correctly');
                return true;
            } else {
                console.log(`⚠️  Worker responded with HTTP ${response.status}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Worker URL validation failed: ${error.message}`);
            return false;
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const options = {};

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--mode':
            case '-m':
                options.mode = args[++i];
                break;
            case '--worker-url':
            case '-w':
                options.workerUrl = args[++i];
                break;
            case '--output-dir':
            case '-o':
                options.outputDir = args[++i];
                break;
            case '--no-report':
                options.generateReport = false;
                break;
            case '--validate':
                const orchestrator = new TestOrchestrator(options);
                await orchestrator.validateWorkerUrl();
                return;
            case '--help':
            case '-h':
                console.log(`
Webflow Way Validator Test Orchestrator

Usage: node run-tests.js [options]

Options:
  -m, --mode <mode>           Test mode: full, sample, custom (default: full)
  -w, --worker-url <url>      Cloudflare Worker URL
  -o, --output-dir <dir>      Output directory for results (default: ./test-results)
  --no-report                 Skip analysis report generation
  --validate                  Validate worker URL without running tests
  -h, --help                  Show this help message

Examples:
  node run-tests.js                                    # Run full test suite
  node run-tests.js --mode sample                      # Run sample tests
  node run-tests.js --worker-url https://my.worker.dev # Use custom worker URL
  node run-tests.js --validate                         # Validate worker only
`);
                return;
            default:
                if (args[i].startsWith('-')) {
                    console.error(`Unknown option: ${args[i]}`);
                    process.exit(1);
                }
        }
    }

    // Validate mode
    if (options.mode && !['full', 'sample', 'custom'].includes(options.mode)) {
        console.error(`Invalid mode: ${options.mode}. Must be one of: full, sample, custom`);
        process.exit(1);
    }

    try {
        const orchestrator = new TestOrchestrator(options);

        // Validate worker URL first if not using default
        if (options.workerUrl && options.workerUrl !== DEFAULT_WORKER_URL) {
            const isValid = await orchestrator.validateWorkerUrl();
            if (!isValid) {
                console.log('⚠️  Proceeding with tests despite validation warning...\n');
            }
        }

        await orchestrator.run();

    } catch (error) {
        console.error('❌ Test orchestration failed:', error.message);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = TestOrchestrator;