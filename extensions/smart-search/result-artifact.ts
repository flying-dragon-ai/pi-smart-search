/** Persist the full CLI output next to the project so nothing is lost to the
 * model context window. Returns the artifact path. */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function persistRawOutput(
	cwd: string,
	action: string,
	raw: string,
	fallback: string,
): Promise<string> {
	const dir = join(cwd, ".pi", "smart-search");
	await mkdir(dir, { recursive: true });
	const fullPath = join(dir, `${Date.now()}-${action}.txt`);
	await writeFile(fullPath, raw || fallback, "utf8");
	return fullPath;
}
