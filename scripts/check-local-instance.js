#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    rootDir: path.join(__dirname, "..")
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root-dir") {
      options.rootDir = path.resolve(argv[++index] || "");
      continue;
    }
    fail(`Unknown argument: ${value}`);
  }

  return options;
}

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing required file: ${filePath}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const configPath = path.join(options.rootDir, "openclaw.json");
  const secretsPath = path.join(options.rootDir, "secrets.local.json");

  requireFile(configPath);
  requireFile(secretsPath);

  const config = readJson(configPath);
  const secrets = readJson(secretsPath);

  const checks = [];

  const agents = Array.isArray(config.agents?.list) ? config.agents.list : [];
  if (agents.length === 0) {
    fail("No agents configured in openclaw.json");
  }
  checks.push("agents-configured");

  const gatewayToken = secrets.runtime?.OPENCLAW_GATEWAY_TOKEN || "";
  if (!gatewayToken) {
    fail("Missing runtime.OPENCLAW_GATEWAY_TOKEN in secrets.local.json");
  }
  checks.push("gateway-token-present");

  const minimaxApiKey = secrets.providers?.["minimax-cn"]?.apiKey || "";
  if (!minimaxApiKey) {
    fail('Missing providers["minimax-cn"].apiKey in secrets.local.json');
  }
  checks.push("minimax-api-key-present");

  const configAccounts = Object.keys(config.channels?.feishu?.accounts || {});
  if (configAccounts.length === 0) {
    fail("No Feishu accounts configured in openclaw.json");
  }
  checks.push("feishu-accounts-configured");

  for (const accountId of configAccounts) {
    const appId = config.channels.feishu.accounts[accountId]?.appId || "";
    const appSecret = secrets.channels?.feishu?.accounts?.[accountId]?.appSecret || "";

    if (!appId) {
      fail(`Missing channels.feishu.accounts.${accountId}.appId in openclaw.json`);
    }
    if (!appSecret) {
      fail(`Missing channels.feishu.accounts.${accountId}.appSecret in secrets.local.json`);
    }
  }
  checks.push("feishu-secrets-aligned");

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "ok",
        rootDir: options.rootDir,
        checksPassed: checks.length,
        checks
      },
      null,
      2
    )}\n`
  );
}

main();
