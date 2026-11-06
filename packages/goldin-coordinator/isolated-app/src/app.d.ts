declare global {
  namespace App {
    interface Platform {
      env: {
        ENVIRONMENT?: string;
        IDENTITY_API_URL?: string;
        GOLDIN_LOGIN_ENABLED?: string;
        GOLDIN_SYNTHETIC_ENABLED?: string;
        GOLDIN_SYNTHETIC_STARTED_AT?: string;
        GOLDIN_SYNTHETIC_EXPIRES_AT?: string;
      };
    }
  }
}
export {};
