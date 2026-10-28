/** Single source of truth: action name → CLI argv. Adding an action means
 * adding one entry here; the tool schema, enum description and validation
 * are all derived, so descriptions cannot drift from behaviour. */
import type { Action, RequiredParam, RunArgs } from "./types.ts";

export const DEFAULT_TIMEOUT_S = 120;

interface ActionSpec {
	name: Action;
	summary: string;
	required?: RequiredParam;
	argv(args: RunArgs, timeout: string): string[];
}

function requireText(value: string | undefined, name: string): string {
	const trimmed = value?.trim();
	if (!trimmed) throw new Error(`${name} is required for this action`);
	if (trimmed.length > 4000) throw new Error(`${name} exceeds 4000 characters`);
	return trimmed;
}


const PUBLIC_SPECS: ActionSpec[] = [
	{
		name: "search",
		summary: "网页检索",
		required: "query",
		argv: (a, t) => ["search", requireText(a.query, "query"), "--format", "json", "--timeout", t],
	},
	{
		name: "fetch",
		summary: "抓 URL 正文",
		required: "url",
		argv: (a) => ["fetch", requireText(a.url, "url"), "--format", "json"],
	},
	{
		name: "research",
		summary: "多步研究",
		required: "query",
		argv: (a) => ["research", requireText(a.query, "query"), "--budget", "quick", "--format", "json"],
	},
	{
		name: "route",
		summary: "只解释路由不执行",
		required: "query",
		argv: (a) => ["route", requireText(a.query, "query"), "--format", "json"],
	},
	{
		name: "exa",
		summary: "低噪声检索",
		required: "query",
		argv: (a) => ["exa-search", requireText(a.query, "query"), "--num-results", String(a.count ?? 8), "--format", "json"],
	},
	{
		name: "zhipu",
		summary: "中文/国内源",
		required: "query",
		argv: (a) => ["zhipu-search", requireText(a.query, "query"), "--count", String(a.count ?? 8), "--format", "json"],
	},
	{
		name: "context7-library",
		summary: "库文档检索（先拿 library id）",
		required: "query",
		argv: (a) => ["context7-library", requireText(a.query, "query"), "--format", "json"],
	},
	{
		name: "context7-docs",
		summary: "按 library id 查库文档",
		required: "libraryId",
		argv: (a) => [
			"context7-docs",
			requireText(a.libraryId, "libraryId"),
			requireText(a.query, "query"),
			"--format",
			"json",
		],
	},
	{
		name: "map",
		summary: "站点结构",
		required: "url",
		argv: (a) => ["map", requireText(a.url, "url"), "--limit", String(a.count ?? 20), "--format", "json"],
	},
	{
		name: "doctor",
		summary: "配置体检",
		argv: () => ["doctor", "--format", "json"],
	},
	{
		name: "providers",
		summary: "通道状态",
		argv: () => ["providers", "status", "--format", "json"],
	},
];

const PRIVATE_PLATFORM_SUMMARIES: Record<string, string> = {
	xhs: "小红书笔记",
	wechat: "公众号文章",
	zhihu: "知乎问答",
	weibo: "微博",
	pan: "网盘分享",
	magnet: "磁力/电驴",
	ebook: "电子书镜像",
};

const BUILTIN_ENGINE_SUMMARIES: Record<string, string> = {
	academic: "学术论文（OpenAlex+Semantic Scholar）",
	bilibili: "B站视频",
};

function privateSpec(platform: string, summary: string): ActionSpec {
	return {
		name: platform as Action,
		summary: `私域检索·${summary}`,
		required: "query",
		argv: (a) => [
			"private-search",
			platform,
			requireText(a.query, "query"),
			"--count",
			String(a.count ?? 8),
			"--format",
			"json",
		],
	};
}

export const ACTION_SPECS: readonly ActionSpec[] = [
	...PUBLIC_SPECS,
	...Object.entries(PRIVATE_PLATFORM_SUMMARIES).map(([platform, summary]) => privateSpec(platform, summary)),
	...Object.entries(BUILTIN_ENGINE_SUMMARIES).map(([platform, summary]) => privateSpec(platform, summary)),
];

export const ACTIONS: readonly Action[] = ACTION_SPECS.map((spec) => spec.name);

export const ACTION_ENUM_DESCRIPTION = ACTION_SPECS.map((spec) => `${spec.name}=${spec.summary}`).join("；");

export function requiredParamFor(action: Action): RequiredParam | undefined {
	return ACTION_SPECS.find((spec) => spec.name === action)?.required;
}

export function buildArgv(args: RunArgs): string[] {
	const spec = ACTION_SPECS.find((candidate) => candidate.name === args.action);
	if (!spec) throw new Error(`unknown action: ${args.action as string}`);
	const timeout = String(args.timeoutSeconds ?? DEFAULT_TIMEOUT_S);
	return spec.argv(args, timeout);
}
