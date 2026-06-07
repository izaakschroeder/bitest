import { expect } from "bun:test";

/**
 * Blocks the event loop until the promise resolves and then returns
 * its value or throws if the promise rejects.
 *
 * See: https://github.com/oven-sh/bun/issues/28134
 *
 * @param promise The promise to wait for.
 * @returns The value of the promise.
 */
export function waitForPromise<T>(promise: Promise<T>): T {
	let result: T = undefined as T;
	let thrown = false;
	let err: unknown;
	expect(
		promise.then(
			(v) => {
				result = v;
				return true;
			},
			(e) => {
				err = e;
				thrown = true;
				return true;
			},
		),
	).resolves.toEqual(expect.anything());
	if (thrown) {
		throw err;
	}
	return result;
}
