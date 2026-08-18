import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import sourceMaps from "rollup-plugin-sourcemaps";
import typescript from "rollup-plugin-typescript2";
import json from "@rollup/plugin-json";
import { terser } from "rollup-plugin-terser";
import { createRequire } from "node:module";

// Rollup 4 はこの設定ファイルを ESM として読み込むため、
// CommonJS の require が使えるように createRequire で用意する
const require = createRequire(import.meta.url);
const pkg = require("./package.json");

const libraryName = "computation-system";

export default {
  input: `src/${libraryName}.ts`,
  output: [
    { file: pkg.main, name: libraryName, format: "umd", sourcemap: true },
    {
      file: `dist/${libraryName}.umd.min.js`,
      name: libraryName,
      format: "umd",
      sourcemap: true,
      plugins: [terser()],
    },
    { file: pkg.module, format: "es", sourcemap: true },
    { file: `dist/${libraryName}.esm.min.js`, format: "es", sourcemap: true, plugins: [terser()] },
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: [],
  watch: {
    include: "src/**",
  },
  plugins: [
    // Allow json resolution
    json(),
    // Compile TypeScript files
    typescript({ useTsconfigDeclarationDir: true }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve(),

    // Resolve source maps to the original source
    sourceMaps(),
  ],
};
