import { FixtureImplFnSimple } from "./FixtureImplFnSimple";
import { FixtureImplFnUse } from "./FixtureImplFnUse";
import { FixtureImplStatic } from "./FixtureImplStatic";
import type {
	DependenciesBase,
	FixtureArgsBase,
	FixtureConfig,
	FixtureFnSimple,
	FixtureFnUse,
	FixtureOpaque,
} from "./types";

export function normalizeFixtures(args: FixtureArgsBase): FixtureOpaque[] {
	if (args.length === 1) {
		return Object.entries(args[0]).map(
			([fixtureName, entry]): FixtureOpaque => {
				if (typeof entry === "function") {
					return new FixtureImplFnUse(
						fixtureName,
						entry as FixtureFnUse<DependenciesBase, unknown>,
					);
				}
				if (Array.isArray(entry)) {
					const [fn, config] = entry as unknown as readonly [
						unknown,
						FixtureConfig?,
					];
					if (typeof fn === "function") {
						return new FixtureImplFnUse(
							fixtureName,
							fn as FixtureFnUse<DependenciesBase, unknown>,
							config?.scope,
							config?.auto,
						);
					}
					if (config) {
						return new FixtureImplStatic(
							fixtureName,
							fn,
							config?.scope,
							config?.auto,
						);
					}
				}
				return new FixtureImplStatic(fixtureName, entry);
			},
		);
	}
	if (args.length === 2 || args.length === 3) {
		const name = args[0];
		let config: FixtureConfig;
		let simpleFn: FixtureFnSimple<DependenciesBase, unknown>;
		if (args.length === 3) {
			config = args[1];
			simpleFn = args[2] as FixtureFnSimple<DependenciesBase, unknown>;
		} else {
			simpleFn = args[1] as FixtureFnSimple<DependenciesBase, unknown>;
			config = { scope: "test" };
		}
		return [
			typeof simpleFn !== "function"
				? new FixtureImplStatic(name, simpleFn, config?.scope, config?.auto)
				: new FixtureImplFnSimple(name, simpleFn, config?.scope, config?.auto),
		];
	}
	throw new TypeError(`Invalid fixture value: ${args}`);
}
