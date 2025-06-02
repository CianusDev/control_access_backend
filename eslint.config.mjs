import { defineConfig } from "eslint/config";

export default defineConfig([{
    rules: {
        "no-console": ["error", {
            allow: ["warn", "error", "log"],
        }],
    },
}]);