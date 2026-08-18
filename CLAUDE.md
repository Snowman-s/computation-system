# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

TypeScript library that simulates computational models (Turing machine, Tag system, Minsky register machine, FRACTRAN, elementary cellular automaton, etc.) and converts one model into another that simulates it. Published as `computation-system` on npm. Built from the "TypeScript library starter" template.

## Commands

- `npm run lint` — ESLint on `src/**/*.ts` and `test/**/*.ts`
- `npm test` — run Jest with coverage
- `npm run test:watch` — Jest in watch mode with coverage
- `npm run test:prod` — lint, then test with `--no-cache` (closest to CI)
- Run a single test file: `npx jest test/turingmachine.test.ts`
- Run a single test by name: `npx jest -t "test name"`
- `npm run build` — clean `dist`, compile with `tsc`, bundle with Rollup (`rollup.config.ts`), and generate TSDoc into `docs/` with typedoc
- `npm start` — Rollup in watch mode (rebuilds bundle on change, no type-check output)

Coverage thresholds are enforced in `package.json` (`jest.coverageThreshold`): 85% branches, 95% functions/lines/statements over `src/*.{js,ts}`. New code should keep these passing.

## Architecture

### Two layers: systems and converters

- **Computation systems** (`src/turing-machine.ts`, `tag-system.ts`, `write-first-turing-machine.ts`, `minsky-register-machine.ts`, `fractran.ts`, `elementary-cellular-automaton.ts`): each implements the `ComputationSystem` interface (`src/computation-system.ts`): `start(input)`, `proceed(step)`, `isStopped()`, `getConfiguration()`, `asTuple()`, `clone()`. `asTuple()` returns the operation-independent definition of the machine (rule set, alphabet, etc.); `getConfiguration()` returns the operation-dependent runtime state (tape, head position, current state, ...).
- **Converters** (`src/converter.ts` + `src/converters/*.ts`): each converter is an `ITransformElement<Take, As, TransformLog>` that transforms one `ComputationSystem` into another that simulates it (e.g. Tag System → Turing Machine, Minsky Register Machine → FRACTRAN). `Converter` (in `converter.ts`) is the static factory for all of them. Each converter's `TransformLog` type documents the correspondence table produced by the transformation (which symbol/state maps to what) and is defined in `src/transform-log-types.ts`.

### Transform hierarchy

`createHierarchy()` / `ITransformHierarchy` (in `converter.ts`) chain converters into a stack, e.g. Tag System → Write-First TM → TM(2-symbol) → TM, and drive only the bottom-most (most concrete) system while exposing `getConfiguration(n)` / `getTuple(n)` / `asIndependantSystem(n)` for every level `n` in the stack, translating state back up through each `interpretConfigration`/`interpretInput` step. `appendLastAndNewHierarchy()` extends an existing hierarchy with one more converter. This is the mechanism behind chained universality proofs (e.g. FRACTRAN simulates Minsky Register Machine simulates TM(2-symbol) simulates TM).

### Adding a new computation system or converter

- New system: implement `ComputationSystem`, export it from `src/computation-system.ts`.
- New converter: implement `ITransformElement<Take, As, TransformLog>` in `src/converters/`, add its `TransformLog` type to `src/transform-log-types.ts`, and expose a static factory method on `Converter` in `src/converter.ts`.
- Each system/converter file documents its academic source with a `@see` TSDoc tag citing the paper it implements (see existing files for the citation format) — add one when implementing a new published construction.

### Naming convention

TM-related types are prefixed `TM*` (`TMState`, `TMSymbol`, `TMRule`, ...); values are created via `XxxFrom(...strings)` factory functions (e.g. `TMStateFrom`, `TagSystemLetterFrom`) rather than constructed directly, since identity (not string value) is what's compared internally.

## Code style

- ESLint config: `standard-with-typescript` + `prettier`, enforced via `.eslintrc.json`.
- Prettier: double quotes, semicolons (`package.json` `prettier` field).
- Target `es2020`/`es2015` module output (see `tsconfig.json`) — this library ships as UMD/ESM, no longer targeting ES5/legacy browsers.
