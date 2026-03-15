/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Platform {
      env?: {
        AI: Ai;
      };
    }
  }
}

export {};
