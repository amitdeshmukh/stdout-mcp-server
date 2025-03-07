import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import eslintPluginPrettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
  eslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    ignores: ["build/**/*", "dist/**/*", "node_modules/**/*"],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: {
        // Node.js globals
        process: "readonly",
        console: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        // ES2022 globals
        Promise: "readonly",
        Set: "readonly",
        Map: "readonly",
        WeakMap: "readonly",
        WeakSet: "readonly",
        Proxy: "readonly",
        Reflect: "readonly",
        globalThis: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "prettier": eslintPluginPrettier
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
      "prettier/prettier": "error"
    }
  },
  prettierConfig
];
