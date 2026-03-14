#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const oldLine =
  'if (!isSubagentSessionKey(storeKey)) return invalid("spawnedBy is only supported for subagent:* sessions");';
const newLine =
  'if (!(isSubagentSessionKey(storeKey) || storeKey.includes(":acp:"))) return invalid("spawnedBy is only supported for subagent:* or *:acp:* sessions");';

function existingDir(dir) {
  return dir && fs.existsSync(dir) && fs.statSync(dir).isDirectory();
}

function npmGlobalRoot() {
  const result = spawnSync("npm", ["root", "-g"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) {
    return "";
  }
  return result.stdout.trim();
}

function candidateDistDirs() {
  const dirs = [];
  if (process.env.OPENCLAW_DIST_DIR) {
    dirs.push(process.env.OPENCLAW_DIST_DIR);
  }

  dirs.push(
    "/opt/homebrew/lib/node_modules/openclaw/dist",
    "/usr/local/lib/node_modules/openclaw/dist"
  );

  const npmRoot = npmGlobalRoot();
  if (npmRoot) {
    dirs.push(path.join(npmRoot, "openclaw", "dist"));
  }

  return [...new Set(dirs)].filter(existingDir);
}

function findTargets() {
  for (const distDir of candidateDistDirs()) {
    const files = fs
      .readdirSync(distDir)
      .filter((name) => /^gateway-cli-.*\.js$/.test(name))
      .map((name) => path.join(distDir, name));

    if (files.length > 0) {
      return files;
    }
  }

  return [];
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function backupPath(file) {
  return `${file}.bak-acp-spawnedby`;
}

function inspectFile(file) {
  const content = read(file);
  const hasOld = content.includes(oldLine);
  const hasNew = content.includes(newLine);
  return { file, hasOld, hasNew };
}

function printStatus(result) {
  const state = result.hasNew
    ? "patched"
    : result.hasOld
      ? "needs_patch"
      : "unknown";
  console.log(`${state} ${result.file}`);
}

function ensureKnownLayout(result) {
  if (!result.hasOld && !result.hasNew) {
    throw new Error(`unknown file layout: ${result.file}`);
  }
}

function applyPatch(result) {
  ensureKnownLayout(result);
  if (result.hasNew) {
    console.log(`already patched ${result.file}`);
    return;
  }

  const file = result.file;
  const content = read(file);
  const next = content.replace(oldLine, newLine);
  if (next === content) {
    throw new Error(`patch replace failed: ${file}`);
  }

  const backup = backupPath(file);
  if (!fs.existsSync(backup)) {
    write(backup, content);
  }
  write(file, next);
  console.log(`patched ${file}`);
}

function revertPatch(result) {
  ensureKnownLayout(result);
  if (!result.hasNew) {
    console.log(`not patched ${result.file}`);
    return;
  }

  const file = result.file;
  const backup = backupPath(file);
  if (fs.existsSync(backup)) {
    write(file, read(backup));
    console.log(`reverted ${file} from backup`);
    return;
  }

  const content = read(file);
  const next = content.replace(newLine, oldLine);
  if (next === content) {
    throw new Error(`revert replace failed: ${file}`);
  }
  write(file, next);
  console.log(`reverted ${file} from inline replace`);
}

function main() {
  const command = process.argv[2] || "status";
  const targets = findTargets();
  if (targets.length === 0) {
    throw new Error(
      "openclaw gateway dist files not found. Set OPENCLAW_DIST_DIR or install openclaw in a supported global location."
    );
  }
  const results = targets.map(inspectFile);

  if (command === "status") {
    results.forEach(printStatus);
    return;
  }

  if (command === "apply") {
    results.forEach(applyPatch);
    return;
  }

  if (command === "revert") {
    results.forEach(revertPatch);
    return;
  }

  console.error("usage: node scripts/openclaw-acp-spawnedby-patch.js [status|apply|revert]");
  process.exit(1);
}

main();
