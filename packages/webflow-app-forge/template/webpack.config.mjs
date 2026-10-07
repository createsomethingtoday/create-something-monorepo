import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Review-safe build rules, in order of why they exist:
//
// 1. Source maps never ship in the bundle. Production writes a hidden map
//    (no sourceMappingURL comment) into ../review-artifacts/, which is the
//    file you attach to the submission form's private upload. Development
//    uses cheap-module-source-map so even a dev bundle never contains eval().
// 2. No style-loader. Runtime <style> injection reads as inline styles under
//    a strict CSP. Styles live in public/styles.css.
// 3. Production mode only for anything you upload. `npm run build` enforces it.
export default (_env, argv) => {
  const isProduction = argv.mode === "production";
  return {
    mode: isProduction ? "production" : "development",
    entry: "./src/index.tsx",
    output: {
      filename: "bundle.js",
      path: path.resolve(dirname, "public"),
      sourceMapFilename: "../review-artifacts/[file].map",
      clean: false,
    },
    devtool: isProduction ? "hidden-source-map" : "cheap-module-source-map",
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: "ts-loader",
        },
      ],
    },
    performance: {
      // The Marketplace rejects bundles over 5 MB at upload. Warn well before.
      maxAssetSize: 2 * 1024 * 1024,
      maxEntrypointSize: 2 * 1024 * 1024,
    },
  };
};
