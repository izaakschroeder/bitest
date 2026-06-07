import { expect, test } from "bun:test";
import { getTestFile } from "../getTestFile";

const outOfTest = getTestFile(true);

test("test file identifies path correctly", () => {
	expect(outOfTest).toEqual(import.meta.path);
});

test("test file identifies path correctly", () => {
	const res = getTestFile(true);
	expect(res).toEqual(import.meta.path);
});
