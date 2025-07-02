// testUtils.js - Testing utilities for GraphQL API
import { query, logger } from '../core/database.js';


// Test database setup and teardown
export class TestDatabase {
    static async setup() {
        logger.info('Setting up test database...');
        
        // Create test tables if they don't exist
        await this.createTestTables();
        
        // Insert test data
        await this.insertTestData();
        
        logger.info('Test database setup complete');
    }

    static async teardown() {
        logger.info('Cleaning up test database...');
        
        // Clean up test data
        await this.cleanTestData();
        
        logger.info('Test database cleanup complete');
    }

    static async createTestTables() {
        // This would create minimal test tables
        // In a real implementation, you'd use migrations
        const tables = [
            `CREATE TABLE IF NOT EXISTS test_mail_v2_update_event (
                id varchar PRIMARY KEY,
                trx_hash varchar,
                from_address text,
                to_address text,
                mail_id text,
                subject text,
                body text,
                mark_as_read boolean DEFAULT false,
                created_at timestamp DEFAULT NOW()
            )`,
            `CREATE TABLE IF NOT EXISTS test_user_preferences (
                address varchar PRIMARY KEY,
                email_notifications boolean DEFAULT true,
                theme varchar DEFAULT 'light',
                language varchar DEFAULT 'en',
                timezone varchar DEFAULT 'UTC',
                created_at timestamp DEFAULT NOW(),
                updated_at timestamp DEFAULT NOW()
            )`
        ];

        for (const tableSQL of tables) {
            try {
                await query(tableSQL);
            } catch (error) {
                logger.warn('Test table creation warning:', error.message);
            }
        }
    }

    static async insertTestData() {
        const testMails = [
            {
                id: 'test-mail-1',
                trx_hash: 'test-tx-1',
                from_address: 'sender1test',
                to_address: 'receiver1test',
                mail_id: 'mail-1',
                subject: 'Test Subject 1',
                body: 'Test body content 1',
                mark_as_read: false
            },
            {
                id: 'test-mail-2',
                trx_hash: 'test-tx-2',
                from_address: 'sender2test',
                to_address: 'receiver2test',
                mail_id: 'mail-2',
                subject: 'Test Subject 2',
                body: 'Test body content 2',
                mark_as_read: true
            }
        ];

        for (const mail of testMails) {
            try {
                await query(`
                    INSERT INTO test_mail_v2_update_event 
                    (id, trx_hash, from_address, to_address, mail_id, subject, body, mark_as_read)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (id) DO NOTHING
                `, [mail.id, mail.trx_hash, mail.from_address, mail.to_address, 
                    mail.mail_id, mail.subject, mail.body, mail.mark_as_read]);
            } catch (error) {
                logger.warn('Test data insertion warning:', error.message);
            }
        }
    }

    static async cleanTestData() {
        const testTables = [
            'test_mail_v2_update_event',
            'test_user_preferences'
        ];

        for (const table of testTables) {
            try {
                await query(`DELETE FROM ${table} WHERE id LIKE 'test-%' OR id LIKE '%test'`);
            } catch (error) {
                logger.warn(`Test cleanup warning for ${table}:`, error.message);
            }
        }
    }
}

// GraphQL test helpers
export class GraphQLTestHelper {
    constructor(server) {
        this.server = server;
    }

    async executeQuery(query, variables = {}, context = {}) {
        return await this.server.executeOperation({
            query,
            variables
        }, {
            contextValue: {
                req: { headers: {} },
                res: {},
                user: null,
                ...context
            }
        });
    }

    async testQuery(name, query, variables = {}, expectedFields = []) {
        logger.info(`Testing GraphQL query: ${name}`);
        
        const start = Date.now();
        const response = await this.executeQuery(query, variables);
        const duration = Date.now() - start;

        // Check for errors
        if (response.errors) {
            logger.error(`Query ${name} failed:`, response.errors);
            throw new Error(`GraphQL query failed: ${response.errors[0].message}`);
        }

        // Validate expected fields
        if (expectedFields.length > 0) {
            this.validateResponseFields(response.data, expectedFields, name);
        }

        logger.info(`Query ${name} completed in ${duration}ms`);
        return { response, duration };
    }

    validateResponseFields(data, expectedFields, queryName) {
        for (const field of expectedFields) {
            if (this.getNestedValue(data, field) === undefined) {
                throw new Error(`Missing expected field '${field}' in query ${queryName}`);
            }
        }
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }
}

// Performance testing utilities
export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            queries: [],
            averageResponseTime: 0,
            slowQueries: [],
            errorRate: 0
        };
    }

    startTiming(operationName) {
        return {
            operationName,
            startTime: Date.now(),
            end: () => {
                const duration = Date.now() - Date.now();
                this.recordMetric(operationName, duration);
                return duration;
            }
        };
    }

    recordMetric(operationName, duration, error = null) {
        this.metrics.queries.push({
            operationName,
            duration,
            timestamp: new Date(),
            error: error ? error.message : null
        });

        // Track slow queries (>1000ms)
        if (duration > 1000) {
            this.metrics.slowQueries.push({
                operationName,
                duration,
                timestamp: new Date()
            });
        }

        // Update averages
        this.updateAverages();
    }

    updateAverages() {
        const queries = this.metrics.queries;
        if (queries.length === 0) return;

        // Calculate average response time
        const totalDuration = queries.reduce((sum, query) => sum + query.duration, 0);
        this.metrics.averageResponseTime = totalDuration / queries.length;

        // Calculate error rate
        const errorCount = queries.filter(query => query.error).length;
        this.metrics.errorRate = (errorCount / queries.length) * 100;
    }

    getReport() {
        return {
            totalQueries: this.metrics.queries.length,
            averageResponseTime: Math.round(this.metrics.averageResponseTime),
            slowQueriesCount: this.metrics.slowQueries.length,
            errorRate: this.metrics.errorRate.toFixed(2) + '%',
            slowQueries: this.metrics.slowQueries.slice(-10), // Last 10 slow queries
            recentErrors: this.metrics.queries
                .filter(q => q.error)
                .slice(-5) // Last 5 errors
                .map(q => ({ operation: q.operationName, error: q.error }))
        };
    }

    reset() {
        this.metrics = {
            queries: [],
            averageResponseTime: 0,
            slowQueries: [],
            errorRate: 0
        };
    }
}

// Load testing utilities
export class LoadTester {
    constructor(graphqlHelper) {
        this.graphqlHelper = graphqlHelper;
        this.performanceMonitor = new PerformanceMonitor();
    }

    async runLoadTest(testConfig) {
        const {
            query,
            variables = {},
            concurrentRequests = 10,
            totalRequests = 100,
            rampUpTime = 1000
        } = testConfig;

        logger.info(`Starting load test: ${concurrentRequests} concurrent, ${totalRequests} total requests`);

        const promises = [];
        const delayBetweenBatches = rampUpTime / Math.ceil(totalRequests / concurrentRequests);

        for (let i = 0; i < totalRequests; i += concurrentRequests) {
            const batchSize = Math.min(concurrentRequests, totalRequests - i);
            
            // Create batch of concurrent requests
            const batch = Array.from({ length: batchSize }, async (_, batchIndex) => {
                const timer = this.performanceMonitor.startTiming('loadTest');
                
                try {
                    const response = await this.graphqlHelper.executeQuery(query, variables);
                    const duration = timer.end();
                    
                    if (response.errors) {
                        this.performanceMonitor.recordMetric('loadTest', duration, new Error(response.errors[0].message));
                    } else {
                        this.performanceMonitor.recordMetric('loadTest', duration);
                    }
                    
                    return { success: true, duration, requestNumber: i + batchIndex + 1 };
                } catch (error) {
                    const duration = timer.end();
                    this.performanceMonitor.recordMetric('loadTest', duration, error);
                    return { success: false, error: error.message, duration, requestNumber: i + batchIndex + 1 };
                }
            });

            promises.push(...batch);

            // Wait before next batch (ramp up)
            if (i + concurrentRequests < totalRequests) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }

        // Wait for all requests to complete
        const results = await Promise.all(promises);
        
        // Generate report
        const report = this.generateLoadTestReport(results);
        logger.info('Load test completed:', report);
        
        return report;
    }

    generateLoadTestReport(results) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        const durations = successful.map(r => r.duration);
        durations.sort((a, b) => a - b);

        const report = {
            totalRequests: results.length,
            successfulRequests: successful.length,
            failedRequests: failed.length,
            successRate: ((successful.length / results.length) * 100).toFixed(2) + '%',
            averageResponseTime: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
            medianResponseTime: durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0,
            p95ResponseTime: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
            p99ResponseTime: durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0,
            minResponseTime: durations.length > 0 ? Math.min(...durations) : 0,
            maxResponseTime: durations.length > 0 ? Math.max(...durations) : 0,
            performanceMetrics: this.performanceMonitor.getReport()
        };

        return report;
    }
}

// Integration test utilities
export class IntegrationTestSuite {
    constructor(server) {
        this.graphqlHelper = new GraphQLTestHelper(server);
        this.performanceMonitor = new PerformanceMonitor();
    }

    async runBasicTests() {
        logger.info('🧪 Running basic integration tests...');

        const tests = [
            {
                name: 'Health Check',
                query: `query { healthCheck { status timestamp database cache } }`,
                expectedFields: ['healthCheck.status', 'healthCheck.timestamp']
            },
            {
                name: 'API Info',
                query: `query { getApiInfo { version name environment } }`,
                expectedFields: ['getApiInfo.version', 'getApiInfo.name']
            },
            {
                name: 'Mail Analytics',
                query: `query { getMailAnalytics { totalMails totalUsers mailsToday } }`,
                expectedFields: ['getMailAnalytics.totalMails', 'getMailAnalytics.totalUsers']
            }
        ];

        const results = [];

        for (const test of tests) {
            try {
                const { response, duration } = await this.graphqlHelper.testQuery(
                    test.name,
                    test.query,
                    {},
                    test.expectedFields
                );
                
                results.push({
                    name: test.name,
                    success: true,
                    duration,
                    data: response.data
                });
            } catch (error) {
                results.push({
                    name: test.name,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        logger.info(`✅ Basic tests completed: ${successCount}/${results.length} passed`);

        return results;
    }

    async runPerformanceTests() {
        logger.info('⚡ Running performance tests...');

        const loadTester = new LoadTester(this.graphqlHelper);
        
        const testConfigs = [
            {
                name: 'Analytics Query Load Test',
                query: `query { getMailAnalytics { totalMails totalUsers } }`,
                concurrentRequests: 5,
                totalRequests: 25
            },
            {
                name: 'User Stats Load Test',
                query: `query GetUserStats($address: String!) { 
                    getUserStats(userAddress: $address) { 
                        totalMailsSent totalMailsReceived 
                    } 
                }`,
                variables: { address: 'test-address' },
                concurrentRequests: 3,
                totalRequests: 15
            }
        ];

        const results = [];

        for (const config of testConfigs) {
            try {
                const report = await loadTester.runLoadTest(config);
                results.push({
                    name: config.name,
                    success: true,
                    report
                });
            } catch (error) {
                results.push({
                    name: config.name,
                    success: false,
                    error: error.message
                });
            }
        }

        logger.info('⚡ Performance tests completed');
        return results;
    }
}

// Export test runner
export async function runAllTests(server) {
    logger.info('🚀 Starting comprehensive test suite...');

    try {
        // Setup test environment
        await TestDatabase.setup();

        // Initialize test suite
        const testSuite = new IntegrationTestSuite(server);

        // Run tests
        const basicResults = await testSuite.runBasicTests();
        const performanceResults = await testSuite.runPerformanceTests();

        // Generate final report
        const report = {
            timestamp: new Date().toISOString(),
            basicTests: basicResults,
            performanceTests: performanceResults,
            summary: {
                totalBasicTests: basicResults.length,
                passedBasicTests: basicResults.filter(r => r.success).length,
                totalPerformanceTests: performanceResults.length,
                passedPerformanceTests: performanceResults.filter(r => r.success).length
            }
        };

        logger.info('📊 Test Results Summary:', report.summary);

        return report;

    } catch (error) {
        logger.error('❌ Test suite failed:', error);
        throw error;
    } finally {
        // Cleanup
        await TestDatabase.teardown();
    }
}