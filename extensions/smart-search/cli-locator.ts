/** Locate the smart-search CLI and build the child process environment.
 * Keys stay in ~/.config/smart-search (or SMART_SEARCH_CONFIG_DIR); they are
 * never accepted from or forwarded through tool parameters. */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const FORK_PATH = "D:/codingProjects/GITHUB/smartsearch/bin/smart-search.js";
const NPM_PACKAGE_PARTS = ["@konbakuyomu", "smart-search", "npm", "bin", "smart-search.js"];

export function resolveCliScript(): string {
	if (process.env.PI_SMART_SEARCH_BIN) return process.env.PI_SMART_SEARCH_BIN;
	if (existsSync(FORK_PATH)) return FORK_PATH;
	return join(homedir(), "AppData", "Roaming", "npm", "node_modules", ...NPM_PACKAGE_PARTS);
}

export function buildChildEnv(): NodeJS.ProcessEnv {
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

export function spawnCli(argv: string[], env: NodeJS.ProcessEnv) {
	return spawn(process.execPath, [resolveCliScript(), ...argv], {
		env,
		windowsHide: true,
		stdio: ["ignore", "pipe", "pipe"],
	});
}
