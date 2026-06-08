# `@izaakschroeder/bitest`

Testing utilities for `bun test`. Provides fixture support for `bun:test` compatible with both `vitest` and `playwright` APIs. All provided APIs are more or less identical to those found in `vitest` / `playwright`, and so the documentation in those projects is intended to be used here – deviations should generally be considered bugs unless explicitly noted.

Given `bun`'s recent addition of browser automation support via [`Bun.WebView`], this also paves the way for allowing `bun:test` to do more of what `playwright` does.

The desired end goal of this project is for it to be deprecated and its functionality to be incorporated directly into `bun` (see https://github.com/oven-sh/bun/issues/8257) as it relies on messing with `bun`'s internals (see https://github.com/oven-sh/bun/issues/28134).

## Installation

```sh
bun add @izaakschroeder/bitest
```

Then simply replace `bun:test` with `bitest` and get access to the extended `test`/`describe` functionality.

## Exports

- `test` – wrapped `bun:test` test function with `.extend()`, `.scoped()`, `.use()`, `.each()`, `.for()`, `.only`, `.skip`, `.todo`, `.failing`, `.concurrent`, `.serial`, and their conditional `*If(condition)` variants.
- `xtest` – alias for `test.skip`
- `it` – alias for `test`
- `xit` – alias for `xtest`
- `describe` – wrapped `bun:test` describe with scope tracking for `test.scoped()` / `test.use()`. Supports `.only`, `.skip`, `.todo`, `.concurrent`, `.serial`, `.if`, `.skipIf`, `.todoIf`, and `.each`.
- The rest of `bun:test` re-exported

## Fixtures

Fixtures are reusable pieces of test setup that can be shared across tests. They support dependency injection (fixtures can depend on other fixtures), automatic cleanup via `Symbol.dispose` / `Symbol.asyncDispose` (or an explicit `onCleanup` callback in `vitest`-style fixtures), and three scope levels for sharing across tests.

### Playwright-style (`.extend` with an object)

```ts
import { test as base } from "@izaakschroeder/bitest";

const test = base.extend({
  // fixture with dependencies and cleanup
  db: async (_, use) => {
    const db = await createDatabase();
    await use(db);
    await db.close();
  },
  // fixture depending on another fixture
  user: async ({ db }, use) => {
    const user = await db.findUser("test");
    await use(user);
  },
});

test("works with fixtures", ({ db, user }) => {
  expect(user.name).toBe("test");
});
```

### Vitest-style (`.extend` with a name and a function)

```ts
const test = base
  .extend("port", () => 8080)
  .extend("url", ({ port }) => `http://localhost:${port}`);

test("resolves url", ({ url }) => {
  expect(url).toBe("http://localhost:8080");
});
```

### Static values

```ts
const test = base.extend({
  config: { debug: true },
  timeout: 5000,
});

test("uses static values", ({ config, timeout }) => {
  expect(config.debug).toBe(true);
  expect(timeout).toBe(5000);
});
```

### Fixture configuration

```ts
const test = base.extend({
  // auto: always initialize the fixture even if no test accesses it
  logger: [createLogger, { auto: true, scope: "test" }],

  // scope: share the fixture across an entire file
  cache: [createCache, { scope: "file" }],

  // static value that should be treated as a literal fixture
  greeting: ["hello", { option: true }],
});
```

**Scopes**:

- `"test"` (default) – created and destroyed per-test
- `"file"` – created once per file, shared across tests in that file
- `"worker"` – created once per worker process

### `.scoped()` / `.use()` – lexical scoping

```ts
import { describe, test } from "@izaakschroeder/bitest";

describe("API tests", () => {
  // Fixtures added via `scoped()` (or its alias `use()`) apply only to
  // the tests inside this describe block.
  test.scoped({ apiKey: "test-key" });

  test("uses scoped fixture", ({ apiKey }) => {
    expect(apiKey).toBe("test-key");
  });
});
```

### `test.each` / `test.for`

```ts
const test = base.extend({ multiplier: 2 });

// test.each: spread row elements as individual arguments
test.each([
  [1, 2, 3],
  [4, 5, 9],
] as const)("adds %i + %i = %i", (a, b, expected, { multiplier }) => {
  expect((a + b) * multiplier).toBe(expected * 2);
});

// test.for: pass row as a single tuple argument
test.for([
  { a: 1, b: 2, expected: 3 },
  { a: 4, b: 5, expected: 9 },
] as const)("adds", ({ a, b, expected }, { multiplier }) => {
  expect((a + b) * multiplier).toBe(expected * 2);
});
```

### Disposables

Fixture values implementing `Symbol.dispose` or `Symbol.asyncDispose` are automatically cleaned up at the end of the fixture's scope:

```ts
const test = base.extend({
  resource: () => ({
    data: "important",
    [Symbol.dispose]() {
      cleanup(this.data);
    },
  }),
});
```

For `vitest`-style fixtures you can alternatively use the `onCleanup` callback provided in the second argument:

```ts
const test = base.extend("file", ({}, { onCleanup }) => {
  const handle = openFile();
  onCleanup(() => handle.close());
  return handle;
});
```

## `describe`

The `describe` export wraps `bun:test`'s `describe` with scope tracking so that `.scoped()` / `.use()` fixtures apply correctly within describe blocks.

```ts
import { describe, test } from "bun-test";

describe("group", () => {
  test("inside describe", () => {});
});

describe.skip("skipped", () => {});
describe.if(condition)("conditional", () => {});
describe.each([1, 2, 3])("row %i", (i) => {});
```

The following `describe` modifiers are all wrapped to maintain proper scoping:

- `describe.only`, `describe.skip`, `describe.todo`
- `describe.concurrent`, `describe.serial`
- `describe.if(condition)`, `describe.skipIf(condition)`, `describe.todoIf(condition)`
- `describe.each(table)`

## Internals

The implementation is intentionally factored into small composable pieces under `src/internal/`. The main building blocks are:

- `FixtureMap` / `FixtureMapCombined` / `FixtureMapScoped` – fixture lookup tables with optional parent fallback, multi-map composition, and lexical scope tracking using `AsyncLocalStorage`.
- `FixtureImplFnUse` / `FixtureImplFnSimple` / `FixtureImplStatic` – three flavours of fixture implementation (`playwright`-style `use(value)`, `vitest`-style simple function, and bare static values).
- `FixtureState` / `FixtureStateManager` / `FixtureStateFactory` – per-test fixture resolution, lifetime tracking and cleanup orchestration across the worker / file / test scope hierarchy.
- `createTest` / `createDescribe` – the proxy-based public wrappers that compose all of the above.

Every module has dedicated unit tests under `src/internal/__tests__/`. Run them with `bun test`.

## Known issues

- `describe.if(true)("...", fn)` evaluates `fn` synchronously when invoked inside a wrapped `describe` block, which can lead to subtle ordering differences compared to bun's native behaviour. See the unit tests in `src/internal/__tests__/createDescribe.test.ts` for the supported usage.

## References

- [Vitest Test Context](https://vitest.dev/guide/test-context.html)
- [Playwright Test Fixtures](https://playwright.dev/docs/api/class-test#test-extend)
- [Bun Test](https://bun.sh/docs/test)
- [`Bun.WebView`](https://bun.com/blog/bun-v1.3.12)
- https://github.com/oven-sh/bun/issues/28134
