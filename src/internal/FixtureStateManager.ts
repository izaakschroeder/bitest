import { FixtureMapCombined } from "./FixtureMapCombined";
import { FixtureMapScoped } from "./FixtureMapScoped";
import { FixtureState } from "./FixtureState";
import { getTestFile } from "./getTestFile";
import type { DependenciesBase, IFixtureMap } from "./types";

/**
 * Manages fixture state across three scope levels: worker, file, and test.
 *
 * - **Worker** scope: state is created once per worker process.
 * - **File** scope: state is created once per test file.
 * - **Test** scope: state is created for each individual test.
 *
 * When resolving fixtures, the manager chains these scopes so that
 * file-scoped fixtures inherit from worker-scoped fixtures, and test-scoped
 * fixtures inherit from file-scoped fixtures. This allows fixtures to be
 * shared at the appropriate level.
 *
 * See: {@link FixtureStateFactory}
 */
export class FixtureStateManager<TFixtures extends DependenciesBase> {
	#stateForWorker: FixtureState<TFixtures>;
	#stateForFile: Map<string, FixtureState<TFixtures>> = new Map();
	#fixtures: IFixtureMap;

	constructor(fixtures?: IFixtureMap) {
		this.#fixtures = fixtures ?? {
			empty: () => true,
			get: () => undefined,
			has: () => false,
			auto: () => [],
			keys: () => [],
		};
		this.#stateForWorker = new FixtureState("worker", this.#fixtures);
	}

	#getStateForFile(
		file: string,
		fixtures: IFixtureMap,
	): FixtureState<TFixtures> {
		const existing = this.#stateForFile.get(file);
		if (existing) {
			return existing;
		}
		const scope = FixtureMapScoped.forFile(file);
		const state = new FixtureState(
			"file",
			FixtureMapCombined.from(scope, fixtures),
			this.#stateForWorker,
		);
		this.#stateForFile.set(file, state);
		return state;
	}

	/**
	 * Get the fixture state for a single test. This state encapsulates
	 * all the data for the fixtures – this means, for example, that
	 * fixtures with the scope `test` are initialized and destroyed
	 * uniquely in this state object.
	 * @returns A `FixtureState` object for a single test.
	 */
	getStateForTest(fixtures: IFixtureMap): FixtureState<TFixtures> {
		const file = getTestFile();
		return new FixtureState(
			"test",
			fixtures,
			this.#getStateForFile(file, fixtures),
		);
	}
}
