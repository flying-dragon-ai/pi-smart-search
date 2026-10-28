import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTION_ENUM_DESCRIPTION, ACTIONS, buildArgv, requiredParamFor } from "./action-catalog.ts";

test("actions are unique — no duplicate enum entries", () => {
	assert.equal(new Set(ACTIONS).size, ACTIONS.length);
});

test("enum description covers every action", () => {
	for (const action of ACTIONS) {
		assert.ok(
			ACTION_ENUM_DESCRIPTION.includes(`${action}=`),
			`enum description misses ${action}`,
		);
	}
});

test("public actions build the documented argv", () => {
	assert.deepEqual(buildArgv({ action: "search", query: "MBTI" }), [
		"search",
		"MBTI",
		"--format",
		"json",
		"--timeout",
		"120",
	]);
	assert.deepEqual(buildArgv({ action: "fetch", url: "https://example.com" }), [
		"fetch",
		"https://example.com",
		"--format",
		"json",
	]);
	assert.deepEqual(buildArgv({ action: "doctor" }), ["doctor", "--format", "json"]);
	assert.deepEqual(buildArgv({ action: "providers" }), ["providers", "status", "--format", "json"]);
	assert.deepEqual(buildArgv({ action: "exa", query: "k", count: 3 }), [
		"exa-search",
		"k",
		"--num-results",
		"3",
		"--format",
		"json",
	]);
});

test("private actions route to private-search with their platform", () => {
	for (const platform of ["xhs", "wechat", "zhihu", "weibo", "pan", "magnet", "ebook", "academic", "bilibili"]) {
		assert.deepEqual(buildArgv({ action: platform as never, query: "MBTI", count: 5 }), [
			"private-search",
			platform,
			"MBTI",
			"--count",
			"5",
			"--format",
			"json",
		]);
	}
});

test("missing required params throw a clear error", () => {
	assert.throws(() => buildArgv({ action: "search" }), /query is required/);
	assert.throws(() => buildArgv({ action: "fetch" }), /url is required/);
	assert.throws(() => buildArgv({ action: "context7-docs", query: "x" }), /libraryId is required/);
	assert.throws(() => buildArgv({ action: "academic" }), /query is required/);
});

test("queries longer than 4000 chars are rejected", () => {
	assert.throws(() => buildArgv({ action: "search", query: "x".repeat(4001) }), /exceeds 4000/);
});

test("required-param map matches the spec table", () => {
	assert.equal(requiredParamFor("search"), "query");
	assert.equal(requiredParamFor("fetch"), "url");
	assert.equal(requiredParamFor("context7-docs"), "libraryId");
	assert.equal(requiredParamFor("doctor"), undefined);
	assert.equal(requiredParamFor("pan"), "query");
});

test("timeout override flows into timeout-aware actions only", () => {
	assert.deepEqual(buildArgv({ action: "search", query: "q", timeoutSeconds: 30 })[5], "30");
	const argv = buildArgv({ action: "xhs", query: "q", timeoutSeconds: 30 });
	assert.ok(!argv.includes("--timeout"), "private-search CLI takes no --timeout flag");
});
