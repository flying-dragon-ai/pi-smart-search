/** Run the smart-search CLI as a child process with timeout + abort handling. */
import type { RunArgs, RunResult } from "./types.ts";
import { DEFAULT_TIMEOUT_S, buildArgv } from "./action-catalog.ts";
import { buildChildEnv, resolveCliScript, spawnCli } from "./cli-locator.ts";
import { compactCliOutput } from "./output-compactor.ts";

const STDOUT_LIMIT = 2_000_000;
const STDERR_LIMIT = 20_000;
const KILL_GRACE_MS = 15_000;

interface Captured {
	stdout: string;
	stderr: string;
}

function captureOutputs(child: ReturnType<typeof spawnCli>): Captured {
	const state: Captured = { stdout: "", stderr: "" };
	child.stdout.setEncoding("utf8");
	child.stderr.setEncoding("utf8");
	child.stdout.on("data", (chunk: string) => {
		if (state.stdout.length < STDOUT_LIMIT) state.stdout += chunk;
	});
	child.stderr.on("data", (chunk: string) => {
		if (state.stderr.length < STDERR_LIMIT) state.stderr += chunk;
	});
	return state;
}

function spawnFailedResult(argv: string[], script: string, message: string, started: number): RunResult {
	return {
		ok: false,
		exitCode: 5,
		argv,
		text: "",
		raw: "",
		truncated: false,
		elapsedMs: Date.now() - started,
		error: `failed to start smart-search: ${message}\nscript: ${script}`,
	};
}

function closeResult(argv: string[], code: number | null, captured: Captured, started: number): RunResult {
	const text = compactCliOutput(captured.stdout);
	return {
		ok: code === 0,
		exitCode: code ?? 5,
		argv,
		text: text || captured.stderr.slice(0, 2000),
		raw: captured.stdout,
		truncated: stdoutTruncated(captured.stdout, text),
		elapsedMs: Date.now() - started,
		error: code === 0 ? undefined : captured.stderr.slice(0, 1500) || `exit ${code}`,
	};
}

function stdoutTruncated(stdout: string, compacted: string): boolean {
	return stdout.length > compacted.length;
}

export function runSmartSearch(args: RunArgs, signal?: AbortSignal): Promise<RunResult> {
	const argv = buildArgv(args);
	const started = Date.now();
	const timeoutMs = (args.timeoutSeconds ?? DEFAULT_TIMEOUT_S) * 1000 + KILL_GRACE_MS;

	return new Promise((resolve) => {
		const child = spawnCli(argv, buildChildEnv());
		const captured = captureOutputs(child);
		const timer = setTimeout(() => child.kill(), timeoutMs);
		const onAbort = () => child.kill();
		signal?.addEventListener("abort", onAbort, { once: true });

		child.on("error", (error) => {
			clearTimeout(timer);
			resolve(spawnFailedResult(argv, resolveCliScript(), error.message, started));
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
			resolve(closeResult(argv, code, captured, started));
		});
	});
}
