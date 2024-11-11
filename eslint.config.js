import { Linter } from "eslint";
import prettierConfig from "eslint-plugin-prettier";
import importPlugin from "eslint-plugin-import";

const eslintRecommended = new Linter().getRules();

export default [
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    ignores: ["node_modules", "build", "package*.json"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        es6: true,
        node: true,
        browser: true,
      },
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
    plugins: {
      prettier: prettierConfig,
      import: importPlugin,
    },
    rules: {
      ...eslintRecommended,
      "prettier/prettier": ["error", prettierConfig.rules],
      "import/no-unresolved": ["error"],
    },
  },
];
