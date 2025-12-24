/**
 * Learning Module Types
 *
 * User installation and enrollment tracking for modules.
 */

export interface Module {
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  features: string[];
  duration?: string;
  difficulty?: string;
  version?: string;
  lastUpdated?: string;
  relatedModules?: string[];
  examples?: ModuleExample[];
}

export interface ModuleExample {
  title: string;
  description: string;
  lessonId?: string;
}

/**
 * User's module enrollment record.
 */
export interface UserModule {
  userId: string;
  moduleSlug: string;
  enabled: boolean;              // Whether module is actively enabled
  enrolledAt: string;            // ISO date when user enabled the module
  progressPercentage?: number;   // 0-100, computed from lessons
  lastAccessedAt?: string;       // ISO date of last lesson access
}

/**
 * API response types for modules.
 */
export interface ModulesListResponse {
  modules: Module[];
  categories: string[];
}

export interface UserModulesResponse {
  modules: UserModule[];
}

export interface ModuleEnableResponse {
  success: boolean;
  module: UserModule;
}

export interface ModuleDisableResponse {
  success: boolean;
  message: string;
}
