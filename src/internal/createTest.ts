import type { Test as BunTest, TestOptions } from "bun:test";
import { FixtureMapScoped } from "./FixtureMapScoped";
import { FixtureStateFactory } from "./FixtureStateFactory";
import { getTestFile } from "./getTestFile";
import { normalizeFixtures } from "./normalizeFixtures";
import type {
	DependenciesBase,
	FixtureArgsBase,
	IFixtureMap,
	Test,
} from "./types";

const statics = [
	"only",
	"skip",
	"todo",
	"failing",
	"concurrent",
	"serial",
] as const;
const ifs = [
	"if",
	"skipIf",
	"todoIf",
	"failingIf",
	"concurrentIf",
	"serialIf",
] as const;

type KeyStatic = (typeof statics)[number];
type KeyIf = (typeof ifs)[number];

// Each entry takes the current factory and base test and returns
// whatever the corresponding property on the resulting `Test` should
// resolve to. The runtime shapes are heterogeneous (some return a
// `Test`, some a function returning a `Test`, etc.); the `Test`
// interface describes the per-key public types so we don't need to
// enumerate them here.
type Lifter<TCases extends readonly unknown[]> = (
	factory: FixtureStateFactory<DependenciesBase>,
	base: BunTest<TCases>,
) => unknown;

const mapped: Record<string, Lifter<readonly unknown[]>> = {
	each: liftEach(),
	for: liftFor(),
	extend: liftExtend(),
	scoped: liftScoped(),
	use: liftScoped(),
	override: liftScoped(),
};
for (const entry of statics) {
	mapped[entry] = liftStatic(entry);
}
for (const entry of ifs) {
	mapped[entry] = liftConditional(entry);
}
export function createTest<TCases extends readonly unknown[]>(
	base: BunTest<TCases>,
): Test<DependenciesBase, TCases> {
	return liftTest(
		new FixtureStateFactory<DependenciesBase>([]),
		base,
	) as unknown as Test<DependenciesBase, TCases>;
}

function liftTest<TCases extends readonly unknown[]>(
	factory: FixtureStateFactory<DependenciesBase>,
	base: BunTest<TCases>,
): BunTest<TCases> {
	if (typeof base !== "function") {
		throw new TypeError();
	}
	const res = ((
		str: string,
		fn: (...args: unknown[]) => unknown,
		opts: number | TestOptions | undefined,
	) => {
		const file = getTestFile();
		const scoped: IFixtureMap = FixtureMapScoped.currentOrForFile(file);
		const wrapped = factory.withFixtures((fixtures, ...args) => {
			const out = fn(fixtures, ...args);
			// `Promise.resolve` is required: when the user-provided test
			// callback is synchronous (returns `undefined`) but a fixture
			// that the test depends on resolves asynchronously, bun's
			// runner will tear down the test before the fixture's pending
			// promise has had a chance to settle. Wrapping the return
			// value in a resolved promise yields control back to the event
			// loop and gives bun a stable async boundary to await before
			// the test's cleanup runs.
			return Promise.resolve(out);
		}, scoped);
		return base(str, wrapped, opts);
	}) as BunTest<readonly unknown[]>;
	const cache: Record<string, unknown> = {};
	const proxy: unknown = new Proxy(res, {
		ownKeys(target) {
			const keys = new Set([...Object.keys(mapped), ...Object.keys(target)]);
			return [...keys];
		},
		get(target, key) {
			if (typeof key !== "string") {
				return undefined;
			}
			if (key in target) {
				return (target as unknown as Record<string, unknown>)[key];
			}
			if (key in cache) {
				return cache[key];
			}
			const lifter = mapped[key];
			if (lifter) {
				const out = lifter(factory, base);
				cache[key] = out;
				return out;
			}
			return (base as unknown as Record<string, unknown>)[key];
		},
	});
	return proxy as BunTest<TCases>;
}

function liftStatic(name: KeyStatic) {
	return <TCases extends readonly unknown[]>(
		factory: FixtureStateFactory<DependenciesBase>,
		base: BunTest<TCases>,
	) => liftTest(factory, base[name]);
}

function liftConditional<T extends KeyIf>(name: T) {
	return <TCases extends readonly unknown[]>(
		factory: FixtureStateFactory<DependenciesBase>,
		base: BunTest<TCases>,
	) =>
		(cond: boolean) =>
			liftTest(factory, base[name](cond));
}

function liftExtend() {
	return <TCases extends readonly unknown[]>(
		factory: FixtureStateFactory<DependenciesBase>,
		base: BunTest<TCases>,
	) =>
		(...args: FixtureArgsBase) => {
			const existing = factory.getFixtures();
			const fixtures = normalizeFixtures(args);
			fixtures.push(...existing);
			const child = new FixtureStateFactory<DependenciesBase>(fixtures);
			return liftTest(child, base);
		};
}

function liftEach() {
	return <TCases extends readonly unknown[]>(
		factory: FixtureStateFactory<DependenciesBase>,
		base: BunTest<TCases>,
	) =>
		(...args: Parameters<BunTest<TCases>["each"]>) => {
			const fn = liftTest(factory, base.each(...args));
			return (
				str: string,
				f: (...args: unknown[]) => unknown,
				opts: number | TestOptions | undefined,
			) =>
				fn(str, (fixture, ...args) => f(...args, fixture) as undefined, opts);
		};
}

function liftFor() {
	return <TCases extends readonly unknown[]>(
		factory: FixtureStateFactory<DependenciesBase>,
		base: BunTest<TCases>,
	) =>
		(...args: Parameters<BunTest<TCases>["each"]>) => {
			const fn = liftTest(factory, base.each(...args));
			return (
				str: string,
				f: (...args: unknown[]) => unknown,
				opts: number | TestOptions | undefined,
			) => fn(str, (fixture, ...args) => f(args, fixture) as undefined, opts);
		};
}

function liftScoped() {
	return <TCases extends readonly unknown[]>(
		_factory: FixtureStateFactory<DependenciesBase>,
		_base: BunTest<TCases>,
	) =>
		(...args: FixtureArgsBase) => {
			scoped(...args);
		};
}

function scoped(...args: FixtureArgsBase): unknown {
	const file = getTestFile();
	const scope = FixtureMapScoped.currentOrForFile(file);
	const fixtures = normalizeFixtures(args);
	for (const fixture of fixtures) {
		scope.add(fixture);
	}
	return undefined;
}
