/** pi-smart-search — wraps the local smart-search CLI as one pi tool.
 *
 * Keys stay in ~/.config/smart-search (or SMART_SEARCH_CONFIG_DIR); tool
 * parameters never carry or forward API keys.
 *
 * Module layout:
 *   types.ts            — RunArgs / RunResult / action name unions
 *   action-catalog.ts   — single source of truth: action → CLI argv + schema text
 *   cli-locator.ts      — script resolution + child env (proxy, config dir)
 *   cli-runner.ts       — child-process lifecycle (timeout, abort, capture)
 *   output-compactor.ts — JSON-aware compaction for the model window
 *   result-artifact.ts  — full-output persistence under <project>/.pi/smart-search
 */
import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

import { ACTION_ENUM_DESCRIPTION, ACTIONS, buildArgv } from "./action-catalog.ts";
import { runSmartSearch } from "./cli-runner.ts";
import { persistRawOutput } from "./result-artifact.ts";
import type { RunArgs } from "./types.ts";

const Params = Type.Object({
	action: StringEnum(ACTIONS as unknown as string[], {
		description: ACTION_ENUM_DESCRIPTION,
	}),
	query: Type.Optional(
		Type.String({ description: "检索词。search/research/route/exa/zhipu/私域平台均必填" }),
	),
	url: Type.Optional(Type.String({ description: "fetch/map 的 URL" })),
	libraryId: Type.Optional(Type.String({ description: "context7-docs 的 library id，先用 context7-library 拿到" })),
	count: Type.Optional(Type.Number({ description: "结果条数，默认 8（map 默认 20）" })),
	timeoutSeconds: Type.Optional(Type.Number({ description: "超时秒数，默认 120" })),
});

const TOOL_DESCRIPTION =
	"用本机 smart-search CLI 做带出处的检索：公域网页（search/exa/zhipu）、私域平台（xhs/wechat/zhihu/weibo/pan/magnet/ebook）、" +
	"内置垂直引擎（academic 学术、bilibili 视频）、库文档（context7）与站点抓取（fetch/map）。" +
	"密钥在本机配置里，不要在参数里传 key。事实类问题先 search 或 zhipu，再 fetch 关键来源；" +
	"私域动作用 --fixture 可离线自检，doctor/providers 看通道是否可用。";


export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "pi_smart_search",
		label: "Smart Search",
		description: TOOL_DESCRIPTION,
		parameters: Params,
		async execute(_id, params, signal, _onUpdate, ctx) {
			const result = await runSmartSearch(params as RunArgs, signal);
			const fullPath = await persistRawOutput(
				ctx.cwd,
				String(params.action),
				result.raw,
				result.text,
			);
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
			const { action = "", query = "", url = "" } = args as { action?: string; query?: string; url?: string };
			return new Text(
				theme.fg("toolTitle", theme.bold("pi_smart_search ")) +
					theme.fg("muted", `${action} ${query || url}`.slice(0, 80)),
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
			const result = await runSmartSearch({ action: "doctor", timeoutSeconds: 30 });
			const summary = result.text.split("\n").slice(0, 12).join("\n");
			ctx.ui.notify(result.ok ? summary || "doctor ok" : result.error || summary, result.ok ? "info" : "error");
		},
	});
}
