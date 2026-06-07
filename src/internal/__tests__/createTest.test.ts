import { test as base, beforeEach, expect, vi } from "bun:test";
import { describe } from "../../describe";
import { createTest } from "../createTest";

const test = createTest(base);

beforeEach(() => {
	vi.resetAllMocks();
});

const fooFn = vi.fn(async (_, use: (val: number) => Promise<void>) => {
	await use(5);
});

const barFn = vi.fn(async ({ foo }, use: (val: number) => Promise<void>) => {
	await use(foo + 5);
});

const bazFnDone = vi.fn();

const bazFn = vi.fn(
	async (_, use: (val: { counter: number }) => Promise<void>) => {
		const obj = { counter: 0 };
		await use(obj);
		bazFnDone();
	},
);

const t1 = test.extend({
	foo: fooFn,
});

const t2 = t1.extend({
	bar: barFn,
});

t1("fixture value matches what is passed to `use`", ({ foo }) => {
	expect(foo).toEqual(5);
});

t1("throws on trying to access invalid fixtures", (fixtures) => {
	expect(() => (fixtures as unknown as { baz: unknown }).baz).toThrow();
});

const errorTest = test.extend({
	broken: async (_deps: unknown, _use: (v: number) => Promise<void>) => {
		throw new Error("fixture setup failed");
	},
});

errorTest.failing(
	"fixture function errors propagate correctly",
	({ broken }) => {
		expect(broken).toBeUndefined();
	},
);

t2("fixture should be able to access dependencies", ({ bar }) => {
	expect(bar).toEqual(10);
});

t2("fixture should not be resolved until it is accessed", (v) => {
	expect(barFn).not.toBeCalled();
	expect(v.bar).toEqual(10);
	expect(barFn).toBeCalled();
});

t1("accessing a missing fixture throws", (fixtures) => {
	expect(() => {
		(fixtures as unknown as { baz: unknown }).baz;
	}).toThrow();
});

t1.failing(
	"accessing a missing fixture works in a `.failing` block",
	(fixtures) => {
		(fixtures as unknown as { bar: unknown }).bar;
	},
);

t1.todoIf(false)("todo pass", ({ foo }) => {
	expect(foo).toEqual(5);
});

t1.each([
	[1, 2, 3],
	[4, 5, 9],
] as const)("`test.each` works, case %i + %i = %i", (i, j, k, { foo }) => {
	expect(i + j).toEqual(k);
	expect(foo).toEqual(5);
});

// https://vitest.dev/api/test.html#test-for
t1.for([
	[1, 2, 3],
	[4, 5, 9],
] as const)("`test.for` works, case %i + %i = %i", ([i, j, k], { foo }) => {
	expect(i + j).toEqual(k);
	expect(foo).toEqual(5);
});

const t3 = test.extend({
	foo: [fooFn, { auto: true }] as const,
});

t3("the auto keyword works for tests", () => {
	expect(fooFn).toBeCalled();
});

const t4 = test.extend({
	baz: [bazFn, { scope: "file" }] as const,
});

t4("first file scope entry has empty value", ({ baz }) => {
	expect(baz.counter).toEqual(0);
	++baz.counter;
});

t4("second file scope entry has incremented value", ({ baz }) => {
	expect(baz.counter).toEqual(1);
});

t4("file-scoped destructors not called until file is done", () => {
	expect(bazFnDone).not.toBeCalled();
});

const t5 = test.extend({
	baz: [bazFn, { scope: "test" }] as const,
});

t5("first test scope entry has empty value", ({ baz }) => {
	expect(baz.counter).toEqual(0);
	++baz.counter;
});

t5("second test scope entry has empty value", ({ baz }) => {
	expect(baz.counter).toEqual(0);
});

const t6 = test.extend("foo", () => 5).extend("bar", ({ foo }) => foo + 5);

t6("chained fixtures provide correct values", ({ foo, bar }) => {
	expect(foo).toEqual(5);
	expect(bar).toEqual(10);
});

const t7 = test.extend({
	foo: 5,
	bar: 10,
});

t7("static fixture values work", ({ foo, bar }) => {
	expect(foo).toEqual(5);
	expect(bar).toEqual(10);
});

describe("scoping tests", () => {
	t7("overrides for static values are hoisted", ({ foo, bar }) => {
		expect(foo).toEqual(20);
		expect(bar).toEqual(10);
	});

	t7.scoped({
		foo: 20,
	});

	t7("static fixture values can be overridden", ({ foo, bar }) => {
		expect(foo).toEqual(20);
		expect(bar).toEqual(10);
	});
});

t7(
	"static fixture overrides do not escape their owning block",
	({ foo, bar }) => {
		expect(foo).toEqual(5);
		expect(bar).toEqual(10);
	},
);

const t8 = test.extend("triple", () => 3);

t8("vitest-style simple fixture", ({ triple }) => {
	expect(triple).toEqual(3);
});

const t9 = test.extend("quad", { scope: "test" }, () => 4);

t9("vitest-style simple fixture with config", ({ quad }) => {
	expect(quad).toEqual(4);
});

const t10 = test.extend("greeting", "hello");

t10("vitest-style static fixture via extend", ({ greeting }) => {
	expect(greeting).toEqual("hello");
});

const t11 = test.extend("configStr", { scope: "test" }, "world");

t11("vitest-style static fixture with config via extend", ({ configStr }) => {
	expect(configStr).toEqual("world");
});

test("`.only`, `.skip`, `.todo` are available on extended tests", () => {
	expect(typeof t1.only).toBe("function");
	expect(typeof t1.skip).toBe("function");
	expect(typeof t1.todo).toBe("function");
});

test("lifted properties are cached across accesses", () => {
	expect(t1.only).toBe(t1.only);
	expect(t1.skip).toBe(t1.skip);
	expect(t1.todo).toBe(t1.todo);
});

test("unknown property access falls through to base", () => {
	expect(typeof (test as unknown as { name: unknown }).name).toBe("string");
});

test("Reflect.ownKeys returns lifted method names", () => {
	const keys = Reflect.ownKeys(test as object);
	expect(keys).toContain("only");
	expect(keys).toContain("skip");
	expect(keys).toContain("todo");
	expect(keys).toContain("extend");
	expect(keys).toContain("scoped");
});

test("non-string property access returns undefined", () => {
	const sym = Symbol("x");
	expect((test as unknown as Record<symbol, unknown>)[sym]).toBeUndefined();
});

test("createTest throws if base is not a function", () => {
	expect(() => createTest(undefined as unknown as typeof base)).toThrow(
		TypeError,
	);
});

const tFail = test.extend({
	boom: async (_: unknown, use: (v: number) => Promise<void>) => {
		await use(1);
		throw new Error("cleanup failure");
	},
});

tFail.failing("cleanup errors propagate as test failures", ({ boom }) => {
	expect(boom).toEqual(1);
});

const tAsyncStatic = test.extend("answer", async () => 42 as const);

tAsyncStatic("vitest-style async function fixture", async ({ answer }) => {
	expect(answer).toEqual(42);
});
