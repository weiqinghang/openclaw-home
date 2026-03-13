"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(os.homedir(), ".openclaw");
const DEFAULT_STATE_PATH = path.join(ROOT, "ops", "laojun-group-bootstrap-pending.json");
const DEFAULT_SECRET_WRAPPER = path.join(ROOT, "scripts", "with-openclaw-secrets.sh");
const DEFAULT_CREATE_PROJECT_SCRIPT = path.join(ROOT, "scripts", "create-project-agent.js");

let spawnRunner = spawnSync;

function setSpawnRunner(nextRunner) {
  spawnRunner = nextRunner || spawnSync;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function getConfig(event) {
  const cfg = event?.cfg?.hooks?.internal?.entries?.["laojun-group-bootstrap"]?.config || {};
  return {
    ownerUserId: cfg.ownerUserId || "ou_d14f52a10cdf41c0420c59a273ccad61",
    statePath: cfg.statePath || DEFAULT_STATE_PATH,
    secretWrapper: cfg.secretWrapper || DEFAULT_SECRET_WRAPPER,
    createProjectScript: cfg.createProjectScript || DEFAULT_CREATE_PROJECT_SCRIPT,
    agentId: cfg.agentId || "laojun"
  };
}

function getAgentId(event) {
  return event?.agentId || event?.context?.agentId || "";
}

function getSenderId(context = {}) {
  const metadata = context.metadata || {};
  return metadata.senderId || metadata.userId || context.senderId || context.from || "";
}

function getChatType(context = {}) {
  const metadata = context.metadata || {};
  if (metadata.is_group_chat === true) return "group";
  if (metadata.is_group_chat === false) return "direct";
  if (context.chatType) return context.chatType;
  return "";
}

function parseSessionGroupId(sessionKey = "") {
  const match = /^agent:[^:]+:feishu:group:(oc_[a-z0-9]+)$/i.exec(String(sessionKey));
  return match ? match[1] : "";
}

function getGroupId(event) {
  const context = event?.context || {};
  const metadata = context.metadata || {};
  return metadata.groupId
    || metadata.chatId
    || metadata.conversation_label
    || metadata.conversationLabel
    || context.groupId
    || parseSessionGroupId(event?.sessionKey)
    || "";
}

function getGroupSubject(event) {
  const context = event?.context || {};
  const metadata = context.metadata || {};
  return metadata.group_subject
    || metadata.groupSubject
    || metadata.subject
    || context.groupSubject
    || getGroupId(event);
}

function loadOpenClawConfig() {
  return readJson(path.join(ROOT, "openclaw.json"), {});
}

function isGroupInitialized(groupId, openclawConfig = loadOpenClawConfig()) {
  const feishu = openclawConfig?.channels?.feishu || {};
  const allow = Array.isArray(feishu.groupAllowFrom) ? feishu.groupAllowFrom : [];
  return allow.includes(groupId);
}

function loadState(statePath) {
  return readJson(statePath, { version: 1, pending: {} });
}

function saveState(statePath, state) {
  writeJson(statePath, state);
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveProjectIdentity(groupId, groupSubject) {
  const cleaned = String(groupSubject || "").trim();
  const fallbackSuffix = String(groupId || "").slice(-6) || "new";
  const slug = slugify(cleaned);
  const isOpaqueGroupName = !slug || slug === slugify(groupId) || /^oc-[a-z0-9-]+$/.test(slug);

  if (isOpaqueGroupName) {
    return {
      projectId: `project-${fallbackSuffix}`,
      projectName: cleaned && cleaned !== groupId ? cleaned : `项目 ${fallbackSuffix}`
    };
  }

  return {
    projectId: slug,
    projectName: cleaned
  };
}

function sendDirectMessage(config, targetUserId, message) {
  const result = spawnRunner(config.secretWrapper, [
    "openclaw",
    "message",
    "send",
    "--channel",
    "feishu",
    "--account",
    config.agentId,
    "--target",
    `user:${targetUserId}`,
    "--message",
    message
  ], {
    encoding: "utf8"
  });

  return result.status === 0;
}

function createProject(config, pending) {
  return spawnRunner("node", [
    config.createProjectScript,
    pending.projectId,
    "--project-name",
    pending.projectName,
    "--group-id",
    pending.groupId,
    "--owner-user-id",
    pending.ownerUserId
  ], {
    cwd: ROOT,
    encoding: "utf8"
  });
}

function buildPromptMessage(pending) {
  return [
    "检测到你刚在一个未初始化的新群里给我发了消息。",
    `群ID：${pending.groupId}`,
    `候选 projectId：${pending.projectId}`,
    `候选 projectName：${pending.projectName}`,
    "如果同意我初始化这个群和项目，请直接回复：确认",
    "如果要取消，请回复：取消"
  ].join("\n");
}

function buildSuccessMessage(pending) {
  return [
    "初始化已完成。",
    `groupId：${pending.groupId}`,
    `projectId：${pending.projectId}`,
    `projectName：${pending.projectName}`,
    "默认已开启：群免 @、群级 allowFrom=你"
  ].join("\n");
}

function buildFailureMessage(pending, stderr) {
  return [
    "初始化失败。",
    `groupId：${pending.groupId}`,
    `projectId：${pending.projectId}`,
    stderr ? `原因：${stderr.trim()}` : "原因：未知错误"
  ].join("\n");
}

async function handleRestrictedGroupPrompt(event, config) {
  const context = event.context || {};
  const senderId = getSenderId(context);
  const chatType = getChatType(context);
  const groupId = getGroupId(event);

  if (getAgentId(event) !== config.agentId) return;
  if (chatType !== "group") return;
  if (!groupId) return;
  if (senderId !== config.ownerUserId) return;
  if (isGroupInitialized(groupId)) return;

  const state = loadState(config.statePath);
  const existing = state.pending[groupId];
  if (existing && existing.status === "pending") return;

  const identity = deriveProjectIdentity(groupId, getGroupSubject(event));
  const pending = {
    groupId,
    ownerUserId: senderId,
    projectId: identity.projectId,
    projectName: identity.projectName,
    status: "pending",
    requestedAt: new Date().toISOString()
  };
  state.pending[groupId] = pending;
  saveState(config.statePath, state);
  sendDirectMessage(config, senderId, buildPromptMessage(pending));
}

async function handleDirectConfirmation(event, config) {
  const context = event.context || {};
  const senderId = getSenderId(context);
  const chatType = getChatType(context);
  const content = String(context.content || "").trim();

  if (getAgentId(event) !== config.agentId) return;
  if (chatType !== "direct") return;
  if (senderId !== config.ownerUserId) return;

  const normalized = content.replace(/\s+/g, "");
  if (!["确认", "确认初始化"].includes(normalized)) return;

  const state = loadState(config.statePath);
  const pending = Object.values(state.pending).find((item) => item && item.status === "pending" && item.ownerUserId === senderId);
  if (!pending) return;

  const result = createProject(config, pending);
  if (result.status === 0) {
    pending.status = "completed";
    pending.completedAt = new Date().toISOString();
    state.pending[pending.groupId] = pending;
    saveState(config.statePath, state);
    sendDirectMessage(config, senderId, buildSuccessMessage(pending));
    return;
  }

  pending.status = "failed";
  pending.failedAt = new Date().toISOString();
  pending.error = (result.stderr || result.stdout || "").trim();
  state.pending[pending.groupId] = pending;
  saveState(config.statePath, state);
  sendDirectMessage(config, senderId, buildFailureMessage(pending, result.stderr || result.stdout || ""));
}

async function handler(event) {
  if (!event || event.type !== "message" || event.action !== "received") return;
  const config = getConfig(event);
  await handleRestrictedGroupPrompt(event, config);
  await handleDirectConfirmation(event, config);
}

module.exports = handler;
module.exports.default = handler;
module.exports.getConfig = getConfig;
module.exports.getGroupId = getGroupId;
module.exports.getGroupSubject = getGroupSubject;
module.exports.deriveProjectIdentity = deriveProjectIdentity;
module.exports.isGroupInitialized = isGroupInitialized;
module.exports.loadState = loadState;
module.exports.saveState = saveState;
module.exports.setSpawnRunner = setSpawnRunner;
