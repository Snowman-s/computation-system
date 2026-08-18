import tsPlugin from "@typescript-eslint/eslint-plugin";
import importX from "eslint-plugin-import-x";
import promise from "eslint-plugin-promise";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  { ignores: ["dist/**"] },
  ...tsPlugin.configs["flat/recommended-type-checked"],
  ...tsPlugin.configs["flat/stylistic-type-checked"],
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  promise.configs["flat/recommended"],
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parserOptions: {
        // tsconfig.json の include は "src" のみで test/ を含まないため、
        // lint専用に src と test の両方を含む tsconfig.eslint.json を使う
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // `infer _` や分割代入の `_` は「意図的に使わない」ことを示す
      // 命名規則として使っているため、`_` 始まりの識別子は対象外にする
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  prettier,
];
