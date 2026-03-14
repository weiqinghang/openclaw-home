#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    rootDir: path.join(__dirname, ".."),
    userName: path.basename(os.homedir()),
    homeDir: os.homedir(),
    dataRoot: path.join(os.homedir(), "Documents", "OpenClawData"),
    feishuUserId: "your-feishu-user-id",
    feishuAppId: "your-feishu-app-id",
    force: false
  };
  let homeDirExplicit = false;
  let userNameExplicit = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root-dir") {
      options.rootDir = path.resolve(argv[++index] || "");
      continue;
    }
    if (value === "--user-name") {
      options.userName = argv[++index] || options.userName;
      userNameExplicit = true;
      continue;
    }
    if (value === "--home-dir") {
      options.homeDir = path.resolve(argv[++index] || "");
      homeDirExplicit = true;
      continue;
    }
    if (value === "--data-root") {
      options.dataRoot = path.resolve(argv[++index] || "");
      continue;
    }
    if (value === "--feishu-user-id") {
      options.feishuUserId = argv[++index] || options.feishuUserId;
      continue;
    }
    if (value === "--feishu-app-id") {
      options.feishuAppId = argv[++index] || options.feishuAppId;
      continue;
    }
    if (value === "--force") {
      options.force = true;
      continue;
    }
    fail(`Unknown argument: ${value}`);
  }

  if (userNameExplicit && !homeDirExplicit) {
    options.homeDir = path.join(path.dirname(os.homedir()), options.userName);
    if (options.dataRoot === path.join(os.homedir(), "Documents", "OpenClawData")) {
      options.dataRoot = path.join(options.homeDir, "Documents", "OpenClawData");
    }
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function replaceStrings(value, replacer) {
  if (typeof value === "string") {
    return replacer(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceStrings(item, replacer));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceStrings(item, replacer)])
    );
  }
  return value;
}

function backupFile(filePath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${filePath}.bak-${stamp}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function ensureWritableTarget(filePath, force) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  if (!force) {
    fail(`Refusing to overwrite existing file without --force: ${filePath}`);
  }
  return backupFile(filePath);
}

function generateConfig(template, options) {
  const config = replaceStrings(template, (value) =>
    value.replaceAll("/Users/yourname", options.homeDir)
  );

  const ownerRule =
    config.hooks?.internal?.entries?.["user-permissions"]?.config?.userRules?.find(
      (rule) => rule.name === "owner-feishu"
    );
  if (ownerRule) {
    ownerRule.match.userIds = [options.feishuUserId];
  }

  if (Array.isArray(config.channels?.feishu?.groupAllowFrom)) {
    config.channels.feishu.groupAllowFrom = [options.feishuUserId];
  }

  if (Array.isArray(config.channels?.feishu?.userAllowlist)) {
    config.channels.feishu.userAllowlist = [options.feishuUserId];
  }

  for (const account of Object.values(config.channels?.feishu?.accounts || {})) {
    account.appId = options.feishuAppId;
  }

  return config;
}

function generateSecrets(example) {
  return replaceStrings(example, (value) => value);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const templatePath = path.join(options.rootDir, "openclaw.template.json");
  const secretsExamplePath = path.join(options.rootDir, "secrets.local.example.json");
  const configPath = path.join(options.rootDir, "openclaw.json");
  const secretsPath = path.join(options.rootDir, "secrets.local.json");

  if (!fs.existsSync(templatePath)) {
    fail(`Template file not found: ${templatePath}`);
  }
  if (!fs.existsSync(secretsExamplePath)) {
    fail(`Secrets example file not found: ${secretsExamplePath}`);
  }

  const configBackup = ensureWritableTarget(configPath, options.force);
  const secretsBackup = ensureWritableTarget(secretsPath, options.force);

  const template = readJson(templatePath);
  const secretsExample = readJson(secretsExamplePath);

  const config = generateConfig(template, options);
  const secrets = generateSecrets(secretsExample);

  writeJson(configPath, config);
  writeJson(secretsPath, secrets);

  const output = {
    rootDir: options.rootDir,
    configPath,
    secretsPath,
    backups: [configBackup, secretsBackup].filter(Boolean),
    nextSteps: [
      "Fill runtime.OPENCLAW_GATEWAY_TOKEN in secrets.local.json",
      "Fill providers.minimax-cn.apiKey in secrets.local.json",
      "Fill Feishu appSecret values for enabled accounts in secrets.local.json",
      "Run ./scripts/with-openclaw-secrets.sh openclaw config validate --json",
      "Let your Coding Agent continue the takeover; do not hand-edit more than necessary"
    ]
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main();
