import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const WEB = "C:/Users/Administrator/AppData/Roaming/npm/node_modules/@agegr/pi-web/node_modules";
const require = createRequire(import.meta.url);

function entryOf(name) {
	const pkg = JSON.parse(readFileSync(join(WEB, name, "package.json"), "utf8"));
	let entry = pkg.main ?? "index.js";
	if (pkg.exports?.["."]) {
		const e = pkg.exports["."];
		entry = (typeof e === "string" ? e : e.default ?? e.import ?? e.require) ?? entry;
	}
	return join(WEB, name, entry);
}

const alias = {};
for (const t of ["@earendil-works/pi-coding-agent", "@earendil-works/pi-ai", "@earendil-works/pi-tui", "typebox"]) {
	const e = entryOf(t);
	if (existsSync(e)) alias[t] = e;
}

const { createJiti } = await import("file://" + join(WEB, "jiti/lib/jiti.mjs"));
const jiti = createJiti(join(WEB, "@earendil-works/pi-coding-agent/package.json"), { alias, fsCache: false, moduleCache: false });
const mod = await jiti.import("file:///D:/codingProjects/GITHUB/pi-smart-search/extensions/pi-smart-search.ts");
const tools = [];
mod.default({
	registerTool: (t) => tools.push(t),
	registerCommand: () => {},
	on: () => {},
});
const ctx = {
	cwd: "C:/Users/Administrator/AppData/Local/Temp",
	ui: { notify: (m) => console.log("[notify]", String(m).slice(0, 200)) },
};
for (const action of ["xhs", "wechat"]) {
	const result = await tools[0].execute("t", { action, query: "露营装备", timeoutSeconds: 30 }, undefined, undefined, ctx);
	console.log(action, result.content[0].text.split("\n")[0]);
	if (result.isError && !result.content[0].text.includes("auth_required") && !result.content[0].text.includes("exit=0")) {
		console.log("SMOKE FAIL", action);
		process.exit(1);
	}
}
console.log("SMOKE PASS");
