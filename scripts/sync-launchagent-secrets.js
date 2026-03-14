#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    rootDir: path.join(__dirname, ".."),
    plistFile: path.join(os.homedir(), "Library", "LaunchAgents", "ai.openclaw.gateway.plist"),
    skipLaunchctl: false,
    restartGateway: false,
    checkHealth: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root-dir") {
      options.rootDir = path.resolve(argv[++i] || "");
    } else if (arg === "--plist-file") {
      options.plistFile = path.resolve(argv[++i] || "");
    } else if (arg === "--skip-launchctl") {
      options.skipLaunchctl = true;
    } else if (arg === "--restart-gateway") {
      options.restartGateway = true;
    } else if (arg === "--check-health") {
      options.checkHealth = true;
    } else if (arg === "--no-restart") {
      options.restartGateway = false;
      options.checkHealth = false;
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function requiredEnvMap(secrets) {
  const env = {};
  const gatewayToken = secrets?.runtime?.OPENCLAW_GATEWAY_TOKEN;
  if (!gatewayToken) {
    fail("Missing runtime.OPENCLAW_GATEWAY_TOKEN in secrets.local.json");
  }
  env.OPENCLAW_GATEWAY_TOKEN = gatewayToken;

  const accounts = secrets?.channels?.feishu?.accounts || {};
  for (const [accountId, config] of Object.entries(accounts)) {
    if (!config?.appSecret) {
      fail(`Missing channels.feishu.accounts.${accountId}.appSecret in secrets.local.json`);
    }
    const envName = `FEISHU_${accountId.replaceAll("-", "_").toUpperCase()}_APP_SECRET`;
    env[envName] = config.appSecret;
  }

  return env;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || `exit ${result.status}`;
    fail(`${command} ${args.join(" ")} failed: ${detail.trim()}`);
  }
  return result.stdout;
}

function readPlist(filePath) {
  return JSON.parse(run("plutil", ["-convert", "json", "-o", "-", filePath]));
}

function writePlist(filePath, content) {
  const tmpJson = path.join(os.tmpdir(), `openclaw-launchagent-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(tmpJson, `${JSON.stringify(content, null, 2)}\n`);
  try {
    run("plutil", ["-convert", "xml1", "-o", filePath, tmpJson]);
  } finally {
    fs.rmSync(tmpJson, { force: true });
  }
}

function syncEnvironmentVariables(currentEnv, requiredEnv) {
  const nextEnv = { ...currentEnv };
  const staleKeys = [];

  for (const key of Object.keys(nextEnv)) {
    if (key === "OPENCLAW_GATEWAY_TOKEN" || /^FEISHU_.*_APP_SECRET$/.test(key)) {
      if (!(key in requiredEnv)) {
        delete nextEnv[key];
        staleKeys.push(key);
      }
    }
  }

  for (const [key, value] of Object.entries(requiredEnv)) {
    nextEnv[key] = value;
  }

  return { nextEnv, staleKeys };
}

function updateLaunchctl(requiredEnv, staleKeys, skipLaunchctl) {
  if (skipLaunchctl) {
    return;
  }
  for (const key of staleKeys) {
    spawnSync("launchctl", ["unsetenv", key], { encoding: "utf8" });
  }
  for (const [key, value] of Object.entries(requiredEnv)) {
    run("launchctl", ["setenv", key, value]);
  }
}

function restartGateway(rootDir, checkHealth) {
  const wrapper = path.join(rootDir, "scripts", "with-openclaw-secrets.sh");
  run(wrapper, ["openclaw", "gateway", "restart", "--force"]);
  if (checkHealth) {
    run(wrapper, ["openclaw", "gateway", "health"]);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const secretsFile = path.join(options.rootDir, "secrets.local.json");

  if (!fs.existsSync(secretsFile)) {
    fail(`Secrets file not found: ${secretsFile}`);
  }
  if (!fs.existsSync(options.plistFile)) {
    fail(`LaunchAgent plist not found: ${options.plistFile}`);
  }

  const secrets = readJson(secretsFile);
  const requiredEnv = requiredEnvMap(secrets);
  const plist = readPlist(options.plistFile);
  const currentEnv = plist.EnvironmentVariables || {};
  const { nextEnv, staleKeys } = syncEnvironmentVariables(currentEnv, requiredEnv);

  plist.EnvironmentVariables = nextEnv;
  writePlist(options.plistFile, plist);
  updateLaunchctl(requiredEnv, staleKeys, options.skipLaunchctl);

  if (options.restartGateway) {
    restartGateway(options.rootDir, options.checkHealth);
  }

  console.log(
    JSON.stringify(
      {
        plistFile: options.plistFile,
        updatedKeys: Object.keys(requiredEnv).sort(),
        removedKeys: staleKeys.sort(),
        launchctlUpdated: !options.skipLaunchctl,
        gatewayRestarted: options.restartGateway,
        healthChecked: options.restartGateway && options.checkHealth,
      },
      null,
      2
    )
  );
}

main();
