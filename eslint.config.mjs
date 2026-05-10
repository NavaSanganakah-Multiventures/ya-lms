import { defineConfig } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
  {
    ignores: [".vercel/**/*", ".next/**/*"],
    extends: [...next],
    rules: {
      // The app intentionally uses fetch-on-mount patterns in many client pages.
      // Keep exhaustive-deps active, but do not fail lint for React Compiler's
      // stricter synchronous state-in-effect guidance on existing data loading code.
      "react-hooks/set-state-in-effect": "off",
      // React Compiler currently flags function expressions referenced by effects
      // in several safe component-local fetch helpers. Exhaustive deps still guards
      // stale closures while this project migrates those helpers incrementally.
      "react-hooks/immutability": "off"
    }
  }
]);
