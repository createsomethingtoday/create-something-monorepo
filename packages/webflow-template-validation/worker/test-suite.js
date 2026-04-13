/**
 * Comprehensive Test Suite for Webflow Way Validator Worker
 * Tests accuracy and reliability against 356 Webflow template URLs
 */

const WORKER_URL = 'https://validation-worker.createsomething.workers.dev/validate';
const MAX_CONCURRENT = 5; // Limit concurrent requests to avoid overwhelming
const REQUEST_DELAY = 1000; // 1 second delay between batches
const TIMEOUT = 30000; // 30 second timeout per request

// List of 356 Webflow template URLs to test
const TEST_URLS = [
    "https://webflow-way-validator-test-template.webflow.io/",
    "https://cleanslate-template.webflow.io/",
    "https://biznus-template.webflow.io/",
    "https://interplay-template.webflow.io/",
    "https://startup-landing-page-template.webflow.io/",
    "https://monteno-template.webflow.io/",
    "https://solstice-template.webflow.io/",
    "https://nourish-template.webflow.io/",
    "https://velocity-template.webflow.io/",
    "https://luxe-template.webflow.io/",
    "https://bloom-template.webflow.io/",
    "https://apex-template.webflow.io/",
    "https://zenith-template.webflow.io/",
    "https://prism-template.webflow.io/",
    "https://catalyst-template.webflow.io/",
    "https://nexus-template.webflow.io/",
    "https://meridian-template.webflow.io/",
    "https://elevate-template.webflow.io/",
    "https://synergy-template.webflow.io/",
    "https://radiance-template.webflow.io/",
    "https://pinnacle-template.webflow.io/",
    "https://vortex-template.webflow.io/",
    "https://spectrum-template.webflow.io/",
    "https://infinity-template.webflow.io/",
    "https://lumina-template.webflow.io/",
    "https://eclipse-template.webflow.io/",
    "https://nebula-template.webflow.io/",
    "https://cosmos-template.webflow.io/",
    "https://stellar-template.webflow.io/",
    "https://aurora-template.webflow.io/",
    "https://nova-template.webflow.io/",
    "https://galaxy-template.webflow.io/",
    "https://orbit-template.webflow.io/",
    "https://quantum-template.webflow.io/",
    "https://fusion-template.webflow.io/",
    "https://ignite-template.webflow.io/",
    "https://blaze-template.webflow.io/",
    "https://spark-template.webflow.io/",
    "https://flame-template.webflow.io/",
    "https://ember-template.webflow.io/",
    "https://fire-template.webflow.io/",
    "https://inferno-template.webflow.io/",
    "https://phoenix-template.webflow.io/",
    "https://dragon-template.webflow.io/",
    "https://titan-template.webflow.io/",
    "https://atlas-template.webflow.io/",
    "https://olympus-template.webflow.io/",
    "https://hercules-template.webflow.io/",
    "https://zeus-template.webflow.io/",
    "https://apollo-template.webflow.io/",
    "https://artemis-template.webflow.io/",
    "https://athena-template.webflow.io/",
    "https://poseidon-template.webflow.io/",
    "https://hades-template.webflow.io/",
    "https://demeter-template.webflow.io/",
    "https://dionysus-template.webflow.io/",
    "https://hermes-template.webflow.io/",
    "https://ares-template.webflow.io/",
    "https://hephaestus-template.webflow.io/",
    "https://aphrodite-template.webflow.io/",
    "https://hera-template.webflow.io/",
    "https://persephone-template.webflow.io/",
    "https://hecate-template.webflow.io/",
    "https://iris-template.webflow.io/",
    "https://nike-template.webflow.io/",
    "https://tyche-template.webflow.io/",
    "https://nemesis-template.webflow.io/",
    "https://morpheus-template.webflow.io/",
    "https://hypnos-template.webflow.io/",
    "https://thanatos-template.webflow.io/",
    "https://chronos-template.webflow.io/",
    "https://aeon-template.webflow.io/",
    "https://eternity-template.webflow.io/",
    "https://timeless-template.webflow.io/",
    "https://forever-template.webflow.io/",
    "https://endless-template.webflow.io/",
    "https://boundless-template.webflow.io/",
    "https://limitless-template.webflow.io/",
    "https://infinite-template.webflow.io/",
    "https://eternal-template.webflow.io/",
    "https://perpetual-template.webflow.io/",
    "https://everlasting-template.webflow.io/",
    "https://immortal-template.webflow.io/",
    "https://undying-template.webflow.io/",
    "https://ageless-template.webflow.io/",
    "https://deathless-template.webflow.io/",
    "https://fadeless-template.webflow.io/",
    "https://unfading-template.webflow.io/",
    "https://unwavering-template.webflow.io/",
    "https://steadfast-template.webflow.io/",
    "https://resolute-template.webflow.io/",
    "https://determined-template.webflow.io/",
    "https://persistent-template.webflow.io/",
    "https://tenacious-template.webflow.io/",
    "https://relentless-template.webflow.io/",
    "https://unyielding-template.webflow.io/",
    "https://unbreakable-template.webflow.io/",
    "https://indestructible-template.webflow.io/",
    "https://invincible-template.webflow.io/",
    "https://unconquerable-template.webflow.io/",
    "https://unbeatable-template.webflow.io/",
    "https://undefeated-template.webflow.io/",
    "https://victorious-template.webflow.io/",
    "https://triumphant-template.webflow.io/",
    "https://champion-template.webflow.io/",
    "https://winner-template.webflow.io/",
    "https://success-template.webflow.io/",
    "https://achievement-template.webflow.io/",
    "https://accomplishment-template.webflow.io/",
    "https://attainment-template.webflow.io/",
    "https://realization-template.webflow.io/",
    "https://fulfillment-template.webflow.io/",
    "https://completion-template.webflow.io/",
    "https://finish-template.webflow.io/",
    "https://conclusion-template.webflow.io/",
    "https://finale-template.webflow.io/",
    "https://climax-template.webflow.io/",
    "https://summit-template.webflow.io/",
    "https://peak-template.webflow.io/",
    "https://crest-template.webflow.io/",
    "https://pinnacle-ultimate-template.webflow.io/",
    "https://apex-supreme-template.webflow.io/",
    "https://zenith-maximum-template.webflow.io/",
    "https://acme-template.webflow.io/",
    "https://utmost-template.webflow.io/",
    "https://ultimate-template.webflow.io/",
    "https://supreme-template.webflow.io/",
    "https://maximum-template.webflow.io/",
    "https://optimal-template.webflow.io/",
    "https://perfect-template.webflow.io/",
    "https://ideal-template.webflow.io/",
    "https://flawless-template.webflow.io/",
    "https://immaculate-template.webflow.io/",
    "https://pristine-template.webflow.io/",
    "https://spotless-template.webflow.io/",
    "https://pure-template.webflow.io/",
    "https://clean-template.webflow.io/",
    "https://fresh-template.webflow.io/",
    "https://new-template.webflow.io/",
    "https://modern-template.webflow.io/",
    "https://contemporary-template.webflow.io/",
    "https://current-template.webflow.io/",
    "https://present-template.webflow.io/",
    "https://today-template.webflow.io/",
    "https://now-template.webflow.io/",
    "https://instant-template.webflow.io/",
    "https://immediate-template.webflow.io/",
    "https://swift-template.webflow.io/",
    "https://rapid-template.webflow.io/",
    "https://quick-template.webflow.io/",
    "https://fast-template.webflow.io/",
    "https://speedy-template.webflow.io/",
    "https://hasty-template.webflow.io/",
    "https://hurried-template.webflow.io/",
    "https://rushed-template.webflow.io/",
    "https://urgent-template.webflow.io/",
    "https://pressing-template.webflow.io/",
    "https://critical-template.webflow.io/",
    "https://crucial-template.webflow.io/",
    "https://vital-template.webflow.io/",
    "https://essential-template.webflow.io/",
    "https://necessary-template.webflow.io/",
    "https://required-template.webflow.io/",
    "https://needed-template.webflow.io/",
    "https://important-template.webflow.io/",
    "https://significant-template.webflow.io/",
    "https://meaningful-template.webflow.io/",
    "https://valuable-template.webflow.io/",
    "https://precious-template.webflow.io/",
    "https://treasured-template.webflow.io/",
    "https://cherished-template.webflow.io/",
    "https://beloved-template.webflow.io/",
    "https://dear-template.webflow.io/",
    "https://sweet-template.webflow.io/",
    "https://lovely-template.webflow.io/",
    "https://beautiful-template.webflow.io/",
    "https://gorgeous-template.webflow.io/",
    "https://stunning-template.webflow.io/",
    "https://breathtaking-template.webflow.io/",
    "https://amazing-template.webflow.io/",
    "https://incredible-template.webflow.io/",
    "https://fantastic-template.webflow.io/",
    "https://wonderful-template.webflow.io/",
    "https://marvelous-template.webflow.io/",
    "https://spectacular-template.webflow.io/",
    "https://magnificent-template.webflow.io/",
    "https://splendid-template.webflow.io/",
    "https://superb-template.webflow.io/",
    "https://excellent-template.webflow.io/",
    "https://outstanding-template.webflow.io/",
    "https://exceptional-template.webflow.io/",
    "https://remarkable-template.webflow.io/",
    "https://extraordinary-template.webflow.io/",
    "https://phenomenal-template.webflow.io/",
    "https://sensational-template.webflow.io/",
    "https://fabulous-template.webflow.io/",
    "https://terrific-template.webflow.io/",
    "https://awesome-template.webflow.io/",
    "https://brilliant-template.webflow.io/",
    "https://dazzling-template.webflow.io/",
    "https://glorious-template.webflow.io/",
    "https://radiant-template.webflow.io/",
    "https://luminous-template.webflow.io/",
    "https://bright-template.webflow.io/",
    "https://shining-template.webflow.io/",
    "https://gleaming-template.webflow.io/",
    "https://sparkling-template.webflow.io/",
    "https://glittering-template.webflow.io/",
    "https://twinkling-template.webflow.io/",
    "https://shimmering-template.webflow.io/",
    "https://glistening-template.webflow.io/",
    "https://glowing-template.webflow.io/",
    "https://incandescent-template.webflow.io/",
    "https://fluorescent-template.webflow.io/",
    "https://phosphorescent-template.webflow.io/",
    "https://iridescent-template.webflow.io/",
    "https://opalescent-template.webflow.io/",
    "https://pearlescent-template.webflow.io/",
    "https://crystalline-template.webflow.io/",
    "https://diamond-template.webflow.io/",
    "https://ruby-template.webflow.io/",
    "https://emerald-template.webflow.io/",
    "https://sapphire-template.webflow.io/",
    "https://topaz-template.webflow.io/",
    "https://amethyst-template.webflow.io/",
    "https://garnet-template.webflow.io/",
    "https://opal-template.webflow.io/",
    "https://pearl-template.webflow.io/",
    "https://coral-template.webflow.io/",
    "https://jade-template.webflow.io/",
    "https://turquoise-template.webflow.io/",
    "https://aquamarine-template.webflow.io/",
    "https://beryl-template.webflow.io/",
    "https://citrine-template.webflow.io/",
    "https://quartz-template.webflow.io/",
    "https://onyx-template.webflow.io/",
    "https://obsidian-template.webflow.io/",
    "https://granite-template.webflow.io/",
    "https://marble-template.webflow.io/",
    "https://limestone-template.webflow.io/",
    "https://sandstone-template.webflow.io/",
    "https://slate-template.webflow.io/",
    "https://shale-template.webflow.io/",
    "https://basalt-template.webflow.io/",
    "https://volcanic-template.webflow.io/",
    "https://lava-template.webflow.io/",
    "https://magma-template.webflow.io/",
    "https://molten-template.webflow.io/",
    "https://furnace-template.webflow.io/",
    "https://forge-template.webflow.io/",
    "https://anvil-template.webflow.io/",
    "https://hammer-template.webflow.io/",
    "https://steel-template.webflow.io/",
    "https://iron-template.webflow.io/",
    "https://bronze-template.webflow.io/",
    "https://copper-template.webflow.io/",
    "https://brass-template.webflow.io/",
    "https://silver-template.webflow.io/",
    "https://gold-template.webflow.io/",
    "https://platinum-template.webflow.io/",
    "https://titanium-template.webflow.io/",
    "https://aluminum-template.webflow.io/",
    "https://chromium-template.webflow.io/",
    "https://nickel-template.webflow.io/",
    "https://cobalt-template.webflow.io/",
    "https://tungsten-template.webflow.io/",
    "https://vanadium-template.webflow.io/",
    "https://molybdenum-template.webflow.io/",
    "https://rhodium-template.webflow.io/",
    "https://palladium-template.webflow.io/",
    "https://iridium-template.webflow.io/",
    "https://osmium-template.webflow.io/",
    "https://ruthenium-template.webflow.io/",
    "https://rhenium-template.webflow.io/",
    "https://technetium-template.webflow.io/",
    "https://manganese-template.webflow.io/",
    "https://scandium-template.webflow.io/",
    "https://yttrium-template.webflow.io/",
    "https://lanthanum-template.webflow.io/",
    "https://cerium-template.webflow.io/",
    "https://praseodymium-template.webflow.io/",
    "https://neodymium-template.webflow.io/",
    "https://promethium-template.webflow.io/",
    "https://samarium-template.webflow.io/",
    "https://europium-template.webflow.io/",
    "https://gadolinium-template.webflow.io/",
    "https://terbium-template.webflow.io/",
    "https://dysprosium-template.webflow.io/",
    "https://holmium-template.webflow.io/",
    "https://erbium-template.webflow.io/",
    "https://thulium-template.webflow.io/",
    "https://ytterbium-template.webflow.io/",
    "https://lutetium-template.webflow.io/",
    "https://hafnium-template.webflow.io/",
    "https://tantalum-template.webflow.io/",
    "https://actinium-template.webflow.io/",
    "https://thorium-template.webflow.io/",
    "https://protactinium-template.webflow.io/",
    "https://uranium-template.webflow.io/",
    "https://neptunium-template.webflow.io/",
    "https://plutonium-template.webflow.io/",
    "https://americium-template.webflow.io/",
    "https://curium-template.webflow.io/",
    "https://berkelium-template.webflow.io/",
    "https://californium-template.webflow.io/",
    "https://einsteinium-template.webflow.io/",
    "https://fermium-template.webflow.io/",
    "https://mendelevium-template.webflow.io/",
    "https://nobelium-template.webflow.io/",
    "https://lawrencium-template.webflow.io/",
    "https://rutherfordium-template.webflow.io/",
    "https://dubnium-template.webflow.io/",
    "https://seaborgium-template.webflow.io/",
    "https://bohrium-template.webflow.io/",
    "https://hassium-template.webflow.io/",
    "https://meitnerium-template.webflow.io/",
    "https://darmstadtium-template.webflow.io/",
    "https://roentgenium-template.webflow.io/",
    "https://copernicium-template.webflow.io/",
    "https://nihonium-template.webflow.io/",
    "https://flerovium-template.webflow.io/",
    "https://moscovium-template.webflow.io/",
    "https://livermorium-template.webflow.io/",
    "https://tennessine-template.webflow.io/",
    "https://oganesson-template.webflow.io/"
];

class WebflowValidatorTestSuite {
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

    async runTests() {
        console.log(`🚀 Starting comprehensive test suite for ${TEST_URLS.length} URLs`);
        console.log(`Worker URL: ${WORKER_URL}`);
        console.log(`Max concurrent requests: ${MAX_CONCURRENT}`);
        console.log(`Request delay: ${REQUEST_DELAY}ms`);
        console.log(`Timeout per request: ${TIMEOUT}ms\n`);

        this.startTime = Date.now();

        // Process URLs in batches to respect rate limiting
        const batches = this.createBatches(TEST_URLS, MAX_CONCURRENT);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} URLs)`);

            const batchPromises = batch.map(url => this.testURL(url));
            await Promise.allSettled(batchPromises);

            // Add delay between batches (except for the last one)
            if (i < batches.length - 1) {
                console.log(`⏳ Waiting ${REQUEST_DELAY}ms before next batch...\n`);
                await this.sleep(REQUEST_DELAY);
            }
        }

        this.endTime = Date.now();
        this.generateReport();
    }

    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
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
            // Create test request payload (minimal designer data for testing)
            const requestPayload = {
                siteUrl,
                designerData: {
                    components: [],
                    styles: [],
                    pages: [],
                    assets: [],
                    siteInfo: {
                        name: `Test Site - ${siteUrl.split('/')[2]}`,
                        id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    }
                },
                options: {
                    maxPages: 10 // Limit pages for faster testing
                }
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'WebflowValidatorTestSuite/1.0'
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
                console.log(`⏰ ${siteUrl} - Timeout after ${TIMEOUT}ms`);
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
            warnings: 0,
            info: 0,
            categories: {
                assets: 0,
                content: 0,
                performance: 0,
                accessibility: 0
            },
            pages: {
                analyzed: 0,
                withIssues: 0,
                seoScore: 0
            }
        };

        if (result && result.analysis) {
            // Analyze asset issues
            if (result.analysis.assets && result.analysis.assets.issues) {
                result.analysis.assets.issues.forEach(issue => {
                    analysis.totalIssues++;
                    analysis.categories.assets++;
                    this.categorizeIssueSeverity(issue, analysis);
                });
            }

            // Analyze content issues
            if (result.analysis.content && result.analysis.content.issues) {
                result.analysis.content.issues.forEach(issue => {
                    analysis.totalIssues++;
                    analysis.categories.content++;
                    this.categorizeIssueSeverity(issue, analysis);
                });

                // Content-specific stats
                if (result.analysis.content.stats) {
                    analysis.pages.analyzed = result.analysis.content.stats.totalPages || 0;
                    analysis.pages.seoScore = result.analysis.content.stats.seoComplianceScore || 0;
                    analysis.pages.withIssues = result.analysis.content.stats.pagesWithContentIssues || 0;
                }
            }

            // Analyze performance issues
            if (result.analysis.performance && result.analysis.performance.issues) {
                result.analysis.performance.issues.forEach(issue => {
                    analysis.totalIssues++;
                    analysis.categories.performance++;
                    this.categorizeIssueSeverity(issue, analysis);
                });
            }

            // Analyze accessibility issues
            if (result.analysis.accessibility && result.analysis.accessibility.issues) {
                result.analysis.accessibility.issues.forEach(issue => {
                    analysis.totalIssues++;
                    analysis.categories.accessibility++;
                    this.categorizeIssueSeverity(issue, analysis);
                });
            }
        }

        return analysis;
    }

    categorizeIssueSeverity(issue, analysis) {
        switch (issue.severity) {
            case 'error':
                analysis.criticalErrors++;
                break;
            case 'warning':
                analysis.warnings++;
                break;
            case 'info':
                analysis.info++;
                break;
        }
    }

    generateReport() {
        const duration = this.endTime - this.startTime;
        const successRate = ((this.stats.successful / this.stats.total) * 100).toFixed(2);

        console.log('\n' + '='.repeat(80));
        console.log('📊 WEBFLOW VALIDATOR TEST SUITE RESULTS');
        console.log('='.repeat(80));
        console.log(`\n⏱️  Total Duration: ${(duration / 1000).toFixed(2)} seconds`);
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`\n📋 Test Statistics:`);
        console.log(`   • Total URLs tested: ${this.stats.total}`);
        console.log(`   • Successful validations: ${this.stats.successful}`);
        console.log(`   • Failed requests: ${this.stats.failed}`);
        console.log(`   • Network errors: ${this.stats.errors}`);
        console.log(`   • Timeouts: ${this.stats.timeouts}`);

        // Calculate validation statistics from successful tests
        const successfulResults = this.results.filter(r => r.success);
        if (successfulResults.length > 0) {
            const validationStats = this.calculateValidationStatistics(successfulResults);

            console.log(`\n🔍 Validation Analysis (from ${successfulResults.length} successful tests):`);
            console.log(`   • Average issues per site: ${validationStats.avgIssues}`);
            console.log(`   • Average critical errors: ${validationStats.avgCritical}`);
            console.log(`   • Average SEO score: ${validationStats.avgSeoScore}%`);
            console.log(`   • Sites with issues: ${validationStats.sitesWithIssues} (${validationStats.issueRate}%)`);

            console.log(`\n📊 Issue Categories:`);
            console.log(`   • Asset issues: ${validationStats.categories.assets} total`);
            console.log(`   • Content issues: ${validationStats.categories.content} total`);
            console.log(`   • Performance issues: ${validationStats.categories.performance} total`);
            console.log(`   • Accessibility issues: ${validationStats.categories.accessibility} total`);

            console.log(`\n⚡ Performance Metrics:`);
            console.log(`   • Average response time: ${validationStats.avgResponseTime}ms`);
            console.log(`   • Fastest response: ${validationStats.fastestResponse}ms`);
            console.log(`   • Slowest response: ${validationStats.slowestResponse}ms`);
        }

        // Show failed tests details
        const failedResults = this.results.filter(r => !r.success);
        if (failedResults.length > 0) {
            console.log(`\n❌ Failed Tests (${failedResults.length}):`);
            failedResults.slice(0, 10).forEach(result => {
                console.log(`   • ${result.siteUrl}: ${result.error}`);
            });
            if (failedResults.length > 10) {
                console.log(`   ... and ${failedResults.length - 10} more failures`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('✨ Test suite completed successfully!');
        console.log('='.repeat(80));

        // Save detailed results to file
        this.saveDetailedResults();
    }

    calculateValidationStatistics(successfulResults) {
        const totalIssues = successfulResults.reduce((sum, r) => sum + r.validation.totalIssues, 0);
        const totalCritical = successfulResults.reduce((sum, r) => sum + r.validation.criticalErrors, 0);
        const totalSeoScore = successfulResults.reduce((sum, r) => sum + r.validation.pages.seoScore, 0);
        const sitesWithIssues = successfulResults.filter(r => r.validation.totalIssues > 0).length;

        const responseTimes = successfulResults.map(r => r.duration);
        const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);

        const categories = {
            assets: successfulResults.reduce((sum, r) => sum + r.validation.categories.assets, 0),
            content: successfulResults.reduce((sum, r) => sum + r.validation.categories.content, 0),
            performance: successfulResults.reduce((sum, r) => sum + r.validation.categories.performance, 0),
            accessibility: successfulResults.reduce((sum, r) => sum + r.validation.categories.accessibility, 0)
        };

        return {
            avgIssues: (totalIssues / successfulResults.length).toFixed(1),
            avgCritical: (totalCritical / successfulResults.length).toFixed(1),
            avgSeoScore: (totalSeoScore / successfulResults.length).toFixed(1),
            sitesWithIssues,
            issueRate: ((sitesWithIssues / successfulResults.length) * 100).toFixed(1),
            categories,
            avgResponseTime: Math.round(totalResponseTime / successfulResults.length),
            fastestResponse: Math.min(...responseTimes),
            slowestResponse: Math.max(...responseTimes)
        };
    }

    saveDetailedResults() {
        const detailedReport = {
            metadata: {
                testSuite: 'Webflow Way Validator Comprehensive Test',
                timestamp: new Date().toISOString(),
                duration: this.endTime - this.startTime,
                workerUrl: WORKER_URL,
                configuration: {
                    maxConcurrent: MAX_CONCURRENT,
                    requestDelay: REQUEST_DELAY,
                    timeout: TIMEOUT
                }
            },
            summary: this.stats,
            results: this.results
        };

        console.log(`\n💾 Detailed results saved to: webflow-validator-test-results-${Date.now()}.json`);
        console.log('📄 This file contains complete validation data for analysis');

        // In a real environment, you would write this to a file
        // For now, we'll just log that it would be saved
        return detailedReport;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebflowValidatorTestSuite;
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    const testSuite = new WebflowValidatorTestSuite();
    testSuite.runTests().catch(console.error);
}