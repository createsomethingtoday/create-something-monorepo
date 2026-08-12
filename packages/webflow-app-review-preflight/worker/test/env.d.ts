declare module 'cloudflare:workers' {
  interface ProvidedEnv {
    DB: D1Database;
    ARTIFACTS: R2Bucket;
    ENVIRONMENT: string;
    ALLOWED_ORIGINS: string;
    PREFLIGHT_DEV_TOKEN: string;
    E2B_COORDINATOR_TOKEN: string;
    E2B_API_KEY: string;
    E2B_RUNTIME_TEMPLATE_ID: string;
    PATTERN_COORDINATOR_TOKEN: string;
    GOVERNANCE_APPROVER_TOKEN: string;
    SUBMISSION_RECONCILIATION_TOKEN: string;
    TEST_MIGRATIONS: D1Migration[];
  }
}
