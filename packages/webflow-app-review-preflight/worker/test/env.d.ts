declare module 'cloudflare:workers' {
  interface ProvidedEnv {
    DB: D1Database;
    ARTIFACTS: R2Bucket;
    ENVIRONMENT: string;
    ALLOWED_ORIGINS: string;
    PREFLIGHT_DEV_TOKEN: string;
    E2B_COORDINATOR_TOKEN: string;
    RUNTIME_OBSERVATION_DISPATCH_URL: string;
    RUNTIME_OBSERVATION_DISPATCH_TOKEN: string;
    PATTERN_COORDINATOR_TOKEN: string;
    GOVERNANCE_APPROVER_TOKEN: string;
    TEST_MIGRATIONS: D1Migration[];
  }
}
