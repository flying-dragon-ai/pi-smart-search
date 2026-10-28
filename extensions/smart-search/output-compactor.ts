/** Compact CLI JSON output for the model window: keep identity fields and the
 * first sources; the full payload is persisted to disk by result-artifact. */
export const MAX_MODEL_CHARS = 12_000;

function stringifyError(error: unknown): string {
	return typeof error === "string" ? error : JSON.stringify(error);
}

export function compactCliOutput(raw: string, maxChars: number = MAX_MODEL_CHARS): string {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return raw.slice(0, maxChars);
	}
	const doc = (Array.isArray(parsed) ? parsed[0] : parsed) as Record<string, unknown> | undefined;
	if (!doc || typeof doc !== "object") return raw.slice(0, maxChars);

	const sources = (doc.sources ?? doc.results ?? doc.citations ?? []) as Array<Record<string, unknown>>;
	const lines: string[] = [];
	if (doc.ok !== undefined) lines.push(`ok: ${String(doc.ok)}`);
	if (doc.provider) lines.push(`provider: ${String(doc.provider)}`);
	if (doc.query) lines.push(`query: ${String(doc.query)}`);
	if (doc.content) lines.push(String(doc.content).slice(0, 6000));
	if (doc.final_answer && doc.final_answer !== doc.content) {
		lines.push(String(doc.final_answer).slice(0, 4000));
	}
	if (Array.isArray(sources) && sources.length) {
		lines.push(`sources(${sources.length}):`);
		for (const source of sources.slice(0, 12)) {
			const url = source.url ?? source.link ?? "";
			const title = String(source.title ?? source.name ?? "").slice(0, 80);
			if (url || title) lines.push(`- ${url} ${title}`.trim());
		}
	}
	if (doc.error) lines.push(`error: ${stringifyError(doc.error)}`);
	return lines.join("\n").slice(0, maxChars);
}
