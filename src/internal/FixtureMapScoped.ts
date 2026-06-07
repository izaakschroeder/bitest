import { AsyncLocalStorage } from "node:async_hooks";
import { FixtureMap } from "./FixtureMap";
import type { IFixtureMap } from "./types";

/**
 * A fixture map that is used for representing lexical scopes. The
 * `.scoped` function for example applies to everything within a
 * `describe` block. This class uses `AsyncLocalStorage` to track
 * the scope and apply the appropriate fixtures to everything within
 * that scope.
 *
 * See: {@link IFixtureMap}
 */
export class FixtureMapScoped extends FixtureMap implements IFixtureMap {
	static #files = new Map<string, FixtureMapScoped>();
	static #asyncLocalStorage = new AsyncLocalStorage<FixtureMapScoped>({
		defaultValue: undefined,
		name: "bun-test-fixture-scope",
	});

	constructor(public readonly parent?: FixtureMapScoped | undefined) {
		super([], parent);
	}

	static currentOrForFile(file: string): FixtureMapScoped {
		const current = FixtureMapScoped.current();
		if (current) {
			return current;
		}
		return FixtureMapScoped.forFile(file);
	}

	static forFile(file: string): FixtureMapScoped {
		let existing: FixtureMapScoped | undefined =
			FixtureMapScoped.#files.get(file);
		if (!existing) {
			existing = new FixtureMapScoped();
			FixtureMapScoped.#files.set(file, existing);
		}
		return existing;
	}

	static current(): FixtureMapScoped | undefined {
		return FixtureMapScoped.#asyncLocalStorage.getStore();
	}

	run<T>(fn: () => T): T {
		return FixtureMapScoped.#asyncLocalStorage.run(this, fn);
	}
}
