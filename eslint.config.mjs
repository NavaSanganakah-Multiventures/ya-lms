import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([{
    ignores: [".vercel/**/*"],
    extends: [...next],
    rules: {
        // Client pages intentionally load remote data from mount effects.
        // Keep the rest of the React hook rules active while avoiding false
        // positives for standard async fetch/setState patterns.
        "react-hooks/set-state-in-effect": "off",
    },
}]);
