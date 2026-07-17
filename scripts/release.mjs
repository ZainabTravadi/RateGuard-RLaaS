#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const sdkPackagePath = resolve(root, "rateguard-node", "package.json");
const channelArg = String(process.argv[2] || "stable").toLowerCase();
const channel = ["stable", "beta", "next", "nightly"].includes(channelArg) ? channelArg : "stable";
const distTag = channel === "stable" ? "latest" : channel;

async function main() {
  const pkg = JSON.parse(await readFile(sdkPackagePath, "utf8"));
  if (pkg.private) {
    throw new Error("@rateguard/node must be publishable for release automation.");
  }

  const publishArgs = ["publish", "--workspace", "@rateguard/node", "--tag", distTag];
  const result = spawnSync("npm", publishArgs, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      NODE_AUTH_TOKEN: process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN || "",
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const summaryDir = resolve(root, "benchmarks", "reports");
  await mkdir(summaryDir, { recursive: true });
  await writeFile(
    resolve(summaryDir, "release-channel.txt"),
    `Published @rateguard/node ${pkg.version} to ${distTag} (${channel})\n`,
    "utf8"
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
