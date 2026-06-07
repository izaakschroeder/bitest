import { FixtureMap } from "./FixtureMap";
import { FixtureMapCombined } from "./FixtureMapCombined";
import { FixtureStateManager } from "./FixtureStateManager";
import type { DependenciesBase, FixtureOpaque, IFixtureMap } from "./types";

let ids = 0;

/**
 * Factory that creates fixture state for tests. It holds a list of
 * fixtures and produces wrapped test functions that combine those
 * fixtures with any additional scoped fixtures.
 *
 * Each call to `withFixtures` returns a new function that:
 * 1. Merges the factory's fixtures with scoped fixtures
 * 2. Creates a `FixtureState` for the test
 * 3. Bootstraps auto-fixtures
 * 4. Calls the user function with the resolved fixture proxy
 * 5. Cleans up after the test completes
 */
export class FixtureStateFactory<TFixtures extends DependenciesBase> {
	id: number = ids++;
	#manager: FixtureStateManager<TFixtures> | undefined;
	#fixtures: readonly FixtureOpaque[];
	#fixtureMap: IFixtureMap;

	constructor(fixtures: FixtureOpaque[]) {
		this.#fixtures = fixtures;
		this.#fixtureMap = new FixtureMap(fixtures);
	}

	#getManager(): FixtureStateManager<TFixtures> {
		this.#manager ??= new FixtureStateManager();
		return this.#manager;
	}

	getFixtures(): readonly FixtureOpaque[] {
		return this.#fixtures;
	}

	withFixtures<TRet, TArgs extends []>(
		fn: (fixtures: TFixtures, ...args: TArgs) => TRet,
		scoped: IFixtureMap,
	): (...args: TArgs) => TRet {
		return (...args: TArgs) => {
			const combined = FixtureMapCombined.from(scoped, this.#fixtureMap);
			const state = this.#getManager().getStateForTest(combined);
			try {
				state.bootstrap();
				const res = fn(state.proxy as TFixtures, ...args);
				if (isPromiseLike(res)) {
					return res.then(
						(v: unknown) => {
							state.done();
							return v;
						},
						(e: unknown) => {
							state.done();
							throw e;
						},
					) as TRet;
				}
				state.done();
				return res;
			} catch (err) {
				state.done();
				throw err;
			}
		};
	}
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { then?: unknown }).then === "function"
	);
}
