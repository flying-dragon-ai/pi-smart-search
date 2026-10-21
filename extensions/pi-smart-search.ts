/**
 * pi-smart-search — 把本机 smart-search CLI 包成 pi 工具。
 *
 * 密钥只走 ~/.config/smart-search（或 SMART_SEARCH_CONFIG_DIR），
 * 工具参数里不接受、不转发任何 API key。
 */
import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const ACTIONS = [
	"search",
	"fetch",
	"research",
	"route",
	"exa",
	"zhipu",
	"context7-library",
	"context7-docs",
	"map",
	"doctor",
	"doctor",
	"providers",
	"xhs",
	"wechat",
] as const;

type Action = (typeof ACTIONS)[number];

const MAX_MODEL_CHARS = 12_000;
const DEFAULT_TIMEOUT_S = 120;

interface RunArgs {
	action: Action;
	query?: string;
	url?: string;
	libraryId?: string;
	count?: number;
	timeoutSeconds?: number;
}

interface RunResult {
	ok: boolean;
	exitCode: number;
	argv: string[];
	text: string;
	raw: string;
	truncated: boolean;
	elapsedMs: number;
	error?: string;
}

function cliScript(): string {
	if (process.env.PI_SMART_SEARCH_BIN) return process.env.PI_SMART_SEARCH_BIN;
	const fork = "D:/codingProjects/GITHUB/smartsearch/bin/smart-search.js";
	if (existsSync(fork)) return fork;
	return join(
		homedir(),
		"AppData",
		"Roaming",
		"npm",
		"node_modules",
		"@konbakuyomu",
		"smart-search",
		"npm",
		"bin",
		"smart-search.js",
	);
}

function childEnv(): NodeJS.ProcessEnv {
	const proxy = process.env.PI_SMART_SEARCH_PROXY ?? "http://127.0.0.1:10808";
	const configDir = process.env.SMART_SEARCH_CONFIG_DIR ?? join(homedir(), ".config", "smart-search");
	return {
		...process.env,
		SMART_SEARCH_CONFIG_DIR: configDir,
		NODE_USE_ENV_PROXY: process.env.NODE_USE_ENV_PROXY ?? "1",
		HTTPS_PROXY: process.env.HTTPS_PROXY ?? proxy,
		HTTP_PROXY: process.env.HTTP_PROXY ?? proxy,
		NO_PROXY: process.env.NO_PROXY ?? "localhost,127.0.0.1,::1",
	};
}

function buildArgv(args: RunArgs): string[] {
	const timeout = String(args.timeoutSeconds ?? DEFAULT_TIMEOUT_S);
	switch (args.action) {
		case "search":
			return ["search", requireText(args.query, "query"), "--format", "json", "--timeout", timeout];
		case "fetch":
			return ["fetch", requireText(args.url, "url"), "--format", "json"];
		case "research":
			return ["research", requireText(args.query, "query"), "--budget", "quick", "--format", "json"];
		case "route":
			return ["route", requireText(args.query, "query"), "--format", "json"];
		case "exa":
			return ["exa-search", requireText(args.query, "query"), "--num-results", String(args.count ?? 8), "--format", "json"];
		case "zhipu":
			return ["zhipu-search", requireText(args.query, "query"), "--count", String(args.count ?? 8), "--format", "json"];
		case "context7-library":
			return ["context7-library", requireText(args.query, "query"), "--format", "json"];
		case "context7-docs":
			return ["context7-docs", requireText(args.libraryId, "libraryId"), requireText(args.query, "query"), "--format", "json"];
		case "map":
			return ["map", requireText(args.url, "url"), "--limit", String(args.count ?? 20), "--format", "json"];
		case "doctor":
			return ["doctor", "--format", "json"];
		case "providers":
			return ["providers", "status", "--format", "json"];
		case "xhs":
			return ["xhs-search", requireText(args.query, "query"), "--format", "json"];
		case "wechat":
			return ["wechat-search", requireText(args.query, "query"), "--format", "json"];
	}
}

function requireText(value: string | undefined, name: string): string {
	const trimmed = value?.trim();
	if (!trimmed) throw new Error(`${name} is required for this action`);
	if (trimmed.length > 4000) throw new Error(`${name} exceeds 4000 characters`);
	return trimmed;
}

function compact(raw: string): string {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return raw.slice(0, MAX_MODEL_CHARS);
	}
	const doc = (Array.isArray(parsed) ? parsed[0] : parsed) as Record<string, unknown> | undefined;
	if (!doc || typeof doc !== "object") return raw.slice(0, MAX_MODEL_CHARS);
	const sources = (doc.sources ?? doc.results ?? doc.citations ?? []) as Array<Record<string, unknown>>;
	const lines: string[] = [];
	if (doc.ok !== undefined) lines.push(`ok: ${String(doc.ok)}`);
	if (doc.provider) lines.push(`provider: ${String(doc.provider)}`);
	if (doc.query) lines.push(`query: ${String(doc.query)}`);
	if (doc.content) lines.push(String(doc.content).slice(0, 6000));
	if (doc.final_answer && doc.final_answer !== doc.content) lines.push(String(doc.final_answer).slice(0, 4000));
	if (Array.isArray(sources) && sources.length) {
		lines.push(`sources(${sources.length}):`);
		for (const source of sources.slice(0, 12)) {
			const url = source.url ?? source.link ?? "";
			const title = String(source.title ?? source.name ?? "").slice(0, 80);
			if (url || title) lines.push(`- ${url} ${title}`.trim());
		}
	}
	if (doc.error) lines.push(`error: ${typeof doc.error === "string" ? doc.error : JSON.stringify(doc.error)}`);
	return lines.join("\n").slice(0, MAX_MODEL_CHARS);
}

function runCli(args: RunArgs, signal?: AbortSignal): Promise<RunResult> {
	const argv = buildArgv(args);
	const script = cliScript();
	const started = Date.now();
	const timeoutMs = (args.timeoutSeconds ?? DEFAULT_TIMEOUT_S) * 1000 + 15_000;

	return new Promise((resolve) => {
		const child = spawn(process.execPath, [script, ...argv], {
			env: childEnv(),
			windowsHide: true,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		const timer = setTimeout(() => child.kill(), timeoutMs);
		const onAbort = () => child.kill();
		signal?.addEventListener("abort", onAbort, { once: true });
		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk) => {
			if (stdout.length < 2_000_000) stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
			if (stderr.length < 20_000) stderr += chunk;
		});
		child.on("error", (error) => {
			clearTimeout(timer);
			resolve({
				ok: false,
				exitCode: 5,
				argv,
				text: "",
				raw: "",
				truncated: false,
				elapsedMs: Date.now() - started,
				error: `failed to start smart-search: ${error.message}\nscript: ${script}`,
			});
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
			const text = compact(stdout);
			resolve({
				ok: code === 0,
				exitCode: code ?? 5,
				argv,
				text: text || stderr.slice(0, 2000),
				raw: stdout,
				truncated: stdout.length > text.length,
				elapsedMs: Date.now() - started,
				error: code === 0 ? undefined : stderr.slice(0, 1500) || `exit ${code}`,
			});
		});
	});
}

const Params = Type.Object({
	action: StringEnum(ACTIONS, {
		description:
			"search=网页检索；fetch=抓 URL；research=多步研究；route=只解释路由不执行；exa=低噪声检索；zhipu=中文/国内源；context7-library / context7-docs=库文档；map=站点结构；doctor=配置体检；providers=通道状态",
	}),
	query: Type.Optional(Type.String({ description: "检索词。search/research/route/exa/zhipu/context7 必填" })),
	url: Type.Optional(Type.String({ description: "fetch/map 的 URL" })),
	libraryId: Type.Optional(Type.String({ description: "context7-docs 的 library id，先用 context7-library 拿到" })),
	count: Type.Optional(Type.Number({ description: "结果条数，默认 8（map 默认 20）" })),
	timeoutSeconds: Type.Optional(Type.Number({ description: "超时秒数，默认 120" })),
});

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "pi_smart_search",
		label: "Smart Search",
		description:
			"用本机 smart-search CLI 做带出处的网页检索、抓页、中文检索和库文档查询。密钥在本机配置里，不要在参数里传 key。" +
			"事实类问题先 search 或 zhipu，再 fetch 关键来源。research 只在需要多步交叉验证时用。doctor 用来看通道是否可用。",
		parameters: Params,
		async execute(_id, params, signal, _onUpdate, ctx) {
			const result = await runCli(params as RunArgs, signal);
			const dir = join(ctx.cwd, ".pi", "smart-search");
			await mkdir(dir, { recursive: true });
			const fullPath = join(dir, `${Date.now()}-${params.action}.txt`);
			await writeFile(fullPath, result.raw || result.text, "utf8");
			const header = [
				`action=${params.action} exit=${result.exitCode} elapsed=${result.elapsedMs}ms`,
				`argv: smart-search ${result.argv.join(" ")}`,
				result.error ? `error: ${result.error}` : "",
				result.truncated ? `truncated; full text: ${fullPath}` : "",
			]
				.filter(Boolean)
				.join("\n");
			return {
				content: [{ type: "text", text: `${header}\n\n${result.text || "(empty)"}` }],
				details: { ...result, fullPath },
				isError: !result.ok,
			};
		},
		renderCall(args, theme) {
			const action = (args as { action?: string }).action ?? "";
			const query = (args as { query?: string }).query ?? (args as { url?: string }).url ?? "";
			return new Text(
				theme.fg("toolTitle", theme.bold("pi_smart_search ")) + theme.fg("muted", `${action} ${query}`.slice(0, 80)),
				0,
				0,
			);
		},
		renderResult(result, _opts, theme) {
			const details = result.details as { ok?: boolean; elapsedMs?: number; exitCode?: number } | undefined;
			const mark = details?.ok ? theme.fg("success", "ok") : theme.fg("error", `exit ${details?.exitCode ?? "?"}`);
			return new Text(`${mark} ${theme.fg("dim", `${details?.elapsedMs ?? 0}ms`)}`, 0, 0);
		},
	});

	pi.registerCommand("smart-search", {
		description: "跑 smart-search doctor，看通道是否可用",
		handler: async (_args, ctx) => {
			const result = await runCli({ action: "doctor", timeoutSeconds: 30 });
			const summary = result.text.split("\n").slice(0, 12).join("\n");
			ctx.ui.notify(result.ok ? summary || "doctor ok" : result.error || summary, result.ok ? "info" : "error");
		},
	});
}
