let testFile: string | null | undefined;

/**
 * Return the file for the currently executing test. On `bun` the
 * current test file is always at the root of the stack trace.
 *
 * @returns File for currently executing test.
 */
export function getTestFile(noCache = false): string {
	if (!noCache && testFile) {
		return testFile;
	}
	const old = Error.prepareStackTrace;
	const obj = {};
	Error.prepareStackTrace = (_, captured) => {
		for (let i = captured.length - 1; i >= 0; --i) {
			const entry = captured[i]?.getFileName();
			if (entry && entry !== "[unknown]") {
				testFile = entry;
				break;
			}
		}
	};
	Error.captureStackTrace(obj);
	Error.prepareStackTrace = old;
	if (!testFile) {
		throw new Error("unable to determine test file origin");
	}
	return testFile;
}
