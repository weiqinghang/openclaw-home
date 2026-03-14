#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const HOME = os.homedir();
const ROOT = path.join(HOME, ".openclaw");
const CODEX_HOME = process.env.CODEX_HOME || path.join(HOME, ".codex");
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
const SKILL_ROOTS = [
  path.join(ROOT, "core", "skills"),
  path.join(CODEX_HOME, "skills"),
  path.join(CODEX_HOME, "superpowers", "skills")
];
const DEFAULT_PROJECT_SKILLSET = [
  "find-skills",
  "summarize",
  "spec-kit-workflow",
  "openspec-workflow",
  "extreme-programming"
];

const AGENT_SKILLSETS = {
  wukong: ["find-skills"],
  laojun: [
    "find-skills",
    "summarize",
    "spec-kit-workflow",
    "openspec-workflow",
    "extreme-programming",
    "ui-ux-pro-max",
    "playwright",
    "figma",
    "figma-implement-design"
  ],
  taibai: ["trade-operations-workflow"],
  guanyin: [],
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

function resolveSourceDir(agent) {
  if (agent.sourceDir) {
    return agent.sourceDir;
  }
  if (agent.agentDir) {
    const hasEntryFiles = ENTRY_FILES.some((fileName) =>
      fs.existsSync(path.join(agent.agentDir, fileName))
    );
    if (hasEntryFiles) {
      return agent.agentDir;
    }
    return path.dirname(agent.agentDir);
  }
  return path.join(ROOT, "agents", agent.id);
}

function resolveSkillSet(agent) {
  if (AGENT_SKILLSETS[agent.id]) return AGENT_SKILLSETS[agent.id];
  if (agent.kind === "project" || agent.projectRoot) {
    return DEFAULT_PROJECT_SKILLSET;
  }
  return [];
}

function copyEntryFiles(agent, workspaceDir) {
  const sourceDir = resolveSourceDir(agent);
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

function linkSkillSet(agent, workspaceDir) {
  const skillNames = resolveSkillSet(agent);
  const skillDir = path.join(workspaceDir, "skills");
  replacePath(skillDir);
  ensureDir(skillDir);

  for (const skillName of skillNames) {
    const sourcePath = SKILL_ROOTS
      .map((rootDir) => path.join(rootDir, skillName))
      .find((candidate) => fs.existsSync(candidate));
    if (!sourcePath) {
      throw new Error(`Missing skill for ${agent.id}: ${skillName}`);
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
    copyEntryFiles(agent, workspaceDir);
    linkSkillSet(agent, workspaceDir);
    console.log(`Synced workspace for ${agent.id}: ${workspaceDir}`);
  }
}

main();
