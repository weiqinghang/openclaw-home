#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const HOME = os.homedir();
const ROOT = path.join(HOME, ".openclaw");
const FILES = [
  path.join(ROOT, "openclaw.json"),
  path.join(ROOT, "openclaw.template.json")
];

function usage() {
  console.error("Usage: node scripts/set-data-root.js /absolute/path/to/data-root");
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function getAgentIds(config) {
  return Array.isArray(config.agents?.list)
    ? config.agents.list.map((agent) => agent.id).filter(Boolean)
    : [];
}

function setAgentPaths(config, dataRoot) {
  const agentIds = getAgentIds(config);
  const defaultAgentId = config.agents?.list?.find((agent) => agent.default)?.id || agentIds[0] || "wukong";

  if (config.agents?.defaults) {
    config.agents.defaults.workspace = path.join(dataRoot, "agents", defaultAgentId, "workspace");
    if (config.agents.defaults.memorySearch?.store) {
      config.agents.defaults.memorySearch.store.path = path.join(
        dataRoot,
        "agents",
        "{agentId}",
        "memory-search",
        "index.sqlite"
      );
    }
  }

  for (const agent of config.agents?.list || []) {
    agent.workspace = path.join(dataRoot, "agents", agent.id, "workspace");
  }

  if (config.session) {
    config.session.store = path.join(dataRoot, "agents", "{agentId}", "sessions", "sessions.json");
  }

  const hookConfig = config.hooks?.internal?.entries?.["user-permissions"]?.config;
  if (hookConfig) {
    hookConfig.userDataDir = path.join(dataRoot, "agents", "{agentId}", "users");
    hookConfig.sharedUserDataDir = path.join(dataRoot, "shared-users");
    hookConfig.logDir = path.join(dataRoot, "agents", "{agentId}", "logs", "security");
  }

  return config;
}

const input = process.argv[2];
if (!input) usage();
if (!path.isAbsolute(input)) {
  console.error("Data root must be an absolute path.");
  process.exit(1);
}

for (const filePath of FILES) {
  const config = readJson(filePath);
  writeJson(filePath, setAgentPaths(config, input));
}

console.log(`Updated runtime data root to: ${input}`);
