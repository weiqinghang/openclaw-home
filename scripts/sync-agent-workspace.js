#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const HOME = os.homedir();
const ROOT = path.join(HOME, ".openclaw");
const DATA_ROOT = path.join(HOME, "Documents", "OpenClawData");
const ENTRY_FILES = [
  "AGENTS.md",
  "BOOTSTRAP.md",
  "IDENTITY.md",
  "SOUL.md",
  "USER.md",
  "HEARTBEAT.md",
  "MEMORY.md",
  "TOOLS.md"
];
const SHARED_SAFETY_SOURCE = path.join(ROOT, "docs", "agents", "shared-safety-charter.md");
const SHARED_SAFETY_TARGET = "SHARED-SAFETY.md";
const AGENT_SKILLSETS = {
  wukong: ["find-skills", "summarize"],
  "mega-product-manager": [
    "find-skills",
    "summarize",
    "spec-kit-workflow",
    "openspec-workflow",
    "extreme-programming"
  ],
  taibai: [
    "feishu-doc",
    "trade-operations-workflow",
    "trade-ops-assistant",
    "trade-quote-layout",
    "trade-quotation-template"
  ],
  guanyin: ["summarize"],
  guichengxiang: ["summarize"]
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function replacePath(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function copyEntryFiles(agentId, workspaceDir) {
  const sourceDir = path.join(ROOT, "agents", agentId);
  for (const fileName of ENTRY_FILES) {
    const sourcePath = path.join(sourceDir, fileName);
    if (!fs.existsSync(sourcePath)) continue;
    const targetPath = path.join(workspaceDir, fileName);
    replacePath(targetPath);
    fs.copyFileSync(sourcePath, targetPath);
  }

  if (fs.existsSync(SHARED_SAFETY_SOURCE)) {
    const safetyTargetPath = path.join(workspaceDir, SHARED_SAFETY_TARGET);
    replacePath(safetyTargetPath);
    fs.copyFileSync(SHARED_SAFETY_SOURCE, safetyTargetPath);
  }
}

function linkSkillSet(agentId, workspaceDir) {
  const skillNames = AGENT_SKILLSETS[agentId] || [];
  const skillDir = path.join(workspaceDir, "skills");
  replacePath(skillDir);
  ensureDir(skillDir);

  for (const skillName of skillNames) {
    const sourcePath = path.join(ROOT, "core", "skills", skillName);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing skill for ${agentId}: ${skillName}`);
    }
    const targetPath = path.join(skillDir, skillName);
    fs.symlinkSync(sourcePath, targetPath);
  }
}

function main() {
  const config = readJson(path.join(ROOT, "openclaw.json"));
  const agentIds = process.argv.slice(2);
  const selectedIds = agentIds.length
    ? agentIds
    : (config.agents?.list || []).map((agent) => agent.id).filter(Boolean);

  for (const agent of config.agents?.list || []) {
    if (!selectedIds.includes(agent.id)) continue;
    const workspaceDir = agent.workspace || path.join(DATA_ROOT, "agents", agent.id, "workspace");
    ensureDir(workspaceDir);
    copyEntryFiles(agent.id, workspaceDir);
    linkSkillSet(agent.id, workspaceDir);
    console.log(`Synced workspace for ${agent.id}: ${workspaceDir}`);
  }
}

main();
