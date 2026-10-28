import eslint from "@eslint/js";
import promise from "eslint-plugin-promise";
import tseslint from "typescript-eslint";

const typeCheckedFiles = ["src/**/*.ts", "src/**/*.tsx"];

export default tseslint.config(
  { ignores: ["public/**", "review-artifacts/**", "node_modules/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: typeCheckedFiles,
  })),
  {
    files: typeCheckedFiles,
    plugins: { promise },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
      "@typescript-eslint/no-unused-vars": "error",
      "promise/catch-or-return": "error",
      "require-await": "error",

      // Marketplace review rules the linter can hold the line on.
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-restricted-globals": [
        "error",
        { name: "alert", message: "Use webflow.notify() instead of alert()." },
        { name: "confirm", message: "Use in-extension UI instead of confirm()." },
        { name: "prompt", message: "Use in-extension UI instead of prompt()." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "parent", message: "The extension must not reach into the Designer document. Use Designer APIs." },
        { object: "window", property: "top", message: "The extension must not reach into the Designer document. Use Designer APIs." },
        { object: "document", property: "write", message: "Inserting raw HTML is flagged in review." },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "BinaryExpression[left.property.name='type'][right.value='Section']",
          message: "Identify sections with (await el.getTag()) === 'section'. Preset-created sections report type 'Block'.",
        },
        {
          selector: "BinaryExpression[right.property.name='type'][left.value='Section']",
          message: "Identify sections with (await el.getTag()) === 'section'. Preset-created sections report type 'Block'.",
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Inserting raw HTML into the extension UI is flagged in review.",
        },
      ],
    },
  }
);
