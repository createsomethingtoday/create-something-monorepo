declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    interface Platform {
      env?: {
        AGENCY_ABUNDANCE_API_BASE_URL?: string;
        AGENCY_STAFF_ONBOARDING_URL?: string;
        AGENCY_INTERNAL_API_KEY?: string;
        ABUNDANCE_STAFF_ONBOARDING_TOKEN?: string;
      };
    }
  }
}

export {};
