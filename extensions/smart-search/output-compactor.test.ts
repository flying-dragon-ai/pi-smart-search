import assert from "node:assert/strict";
import { test } from "node:test";
import { compactCliOutput } from "./output-compactor.ts";

test("keeps identity fields and trims sources", () => {
	const raw = JSON.stringify({
		ok: true,
		provider: "academic",
		query: "rag",
		content: "正文",
		sources: Array.from({ length: 20 }, (_, i) => ({ url: `https://x/${i}`, title: `t${i}` })),
	});
	const out = compactCliOutput(raw);
	assert.match(out, /ok: true/);
	assert.match(out, /provider: academic/);
	assert.match(out, /sources\(20\):/);
	assert.equal(out.split("\n").filter((line) => line.startsWith("- ")).length, 12);
});

test("falls back to raw slice for non-JSON output", () => {
	assert.equal(compactCliOutput("plain text output"), "plain text output");
});

test("surfaces the error field", () => {
	const raw = JSON.stringify({ ok: false, error: { code: "rate_limited", message: "HTTP 429" } });
	assert.match(compactCliOutput(raw), /error: .*rate_limited/);
});

test("respects a custom max length", () => {
	const raw = "x".repeat(500);
	assert.equal(compactCliOutput(raw, 10).length, 10);
});

test("final_answer is shown when distinct from content", () => {
	const raw = JSON.stringify({ content: "a", final_answer: "b" });
	const out = compactCliOutput(raw);
	assert.match(out, /b/);
});
