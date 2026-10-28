/** Shared types for the pi-smart-search extension. */

export const PRIVATE_PLATFORMS = [
	"xhs",
	"wechat",
	"zhihu",
	"weibo",
	"pan",
	"magnet",
	"ebook",
] as const;

export const BUILTIN_ENGINES = ["academic", "bilibili"] as const;

export type Action =
	| "search"
	| "fetch"
	| "research"
	| "route"
	| "exa"
	| "zhipu"
	| "context7-library"
	| "context7-docs"
	| "map"
	| "doctor"
	| "providers"
	| (typeof PRIVATE_PLATFORMS)[number]
	| (typeof BUILTIN_ENGINES)[number];

export type RequiredParam = "query" | "url" | "libraryId";

export interface RunArgs {
	action: Action;
	query?: string;
	url?: string;
	libraryId?: string;
	count?: number;
	timeoutSeconds?: number;
}

export interface RunResult {
	ok: boolean;
	exitCode: number;
	argv: string[];
	text: string;
	raw: string;
	truncated: boolean;
	elapsedMs: number;
	error?: string;
}
