export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "isolated-app/.svelte-kit/**",
      "production-app/.svelte-kit/**",
    ],
  },
  {
    files: ["*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: Object.fromEntries(
        [
          "AbortSignal",
          "Buffer",
          "Request",
          "ReadableStream",
          "Response",
          "TextDecoder",
          "TextEncoder",
          "URL",
          "crypto",
          "fetch",
          "process",
          "setTimeout",
          "structuredClone",
        ].map((name) => [name, "readonly"]),
      ),
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": [
        "error",
        { caughtErrors: "none", argsIgnorePattern: "^_" },
      ],
      "no-eval": "error",
      "no-new-func": "error",
      "no-implied-eval": "error",
    },
  },
];
