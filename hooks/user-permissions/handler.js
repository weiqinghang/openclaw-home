"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const DEFAULT_BLOCKED_PATTERNS = [
  "管理员", "admin", "权限", "permission", "让我成为", "把我设为",
  "修改配置", "修改权限", "改我为", "add user", "remove user",
  "sudo", "rm -rf", "rm /", "format", "格式化",
  "帮我", "让我", "给我改", "测试一下", "just do it"
];

const DEFAULT_ROLE_TEMPLATES = {
  admin: {
    allowedTools: ["*"],
    allowedDir: "~"
  },
  trusted: {
    allowedTools: [
      "web_search",
      "web_fetch",
      "browser",
      "feishu_doc",
      "feishu_wiki",
      "feishu_bitable",
      "read",
      "write",
      "message",
      "tts"
    ]
  },
  user: {
    allowedTools: [
      "web_search",
      "web_fetch",
      "browser",
      "feishu_doc",
      "feishu_wiki",
      "feishu_bitable",
      "read",
      "write",
      "message",
      "tts"
    ]
  },
  guest: {
    allowedTools: ["message", "web_search"],
    blockedPatterns: DEFAULT_BLOCKED_PATTERNS
  }
};

function getUserIdFromContext(context) {
  const metadata = context.metadata || {};
  if (metadata.senderId) return metadata.senderId;
  if (metadata.userId) return metadata.userId;
  if (context.senderId) return context.senderId;
  if (context.from) return context.from;
  if (metadata.openId) return `feishu_${metadata.openId}`;
  if (metadata.userId) return `feishu_${metadata.userId}`;
  return "unknown";
}

function getChannelFromContext(context) {
  return context.channelId || context.channel || "unknown";
}

function isBlockedContent(content, patterns) {
  if (!content) return false;
  const lowerContent = String(content).toLowerCase();
  return patterns.some((pattern) => lowerContent.includes(String(pattern).toLowerCase()));
}

function resolvePath(inputPath) {
  if (!inputPath) return inputPath;
  if (inputPath.startsWith("~")) {
    return path.join(os.homedir(), inputPath.slice(1));
  }
  return inputPath;
}

function parseAgentIdFromSessionKey(sessionKey) {
  if (typeof sessionKey !== "string") return null;
  const match = /^agent:([^:]+):/i.exec(sessionKey.trim());
  return match ? sanitizePathSegment(match[1]) : null;
}

function getAgentIdFromEvent(event) {
  const context = event.context || {};
  return sanitizePathSegment(
    event.agentId
      || context.agentId
      || parseAgentIdFromSessionKey(event.sessionKey)
      || "wukong"
  );
}

function resolveTemplatePath(inputPath, replacements = {}) {
  const resolved = resolvePath(inputPath);
  if (!resolved) return resolved;
  return Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value ?? "")),
    resolved
  );
}

function sanitizePathSegment(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function ensureDir(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function ensureUserSubDirs(userDataPath) {
  ["files/uploads", "files/downloads", "sessions"].forEach((subDir) => {
    ensureDir(path.join(userDataPath, subDir));
  });
}

function getUserProfilePath(userDataPath) {
  return path.join(userDataPath, "profile.json");
}

function getUserHabitsPath(userDataPath) {
  return path.join(userDataPath, "habits.json");
}

function getUserMemoryPath(userDataPath) {
  return path.join(userDataPath, "memory.md");
}

function getUserWorkRecordsPath(userDataPath) {
  return path.join(userDataPath, "work_records.md");
}

function createUserProfile(userId, channel, role, profileOverrides = {}) {
  const now = new Date().toISOString();
  return {
    userId,
    nickname: "",
    role,
    channel,
    createdAt: now,
    lastActive: now,
    settings: {
      timezone: "Asia/Shanghai",
      language: "zh-CN",
      notification: {
        enabled: true,
        channels: [channel]
      }
    },
    ...profileOverrides
  };
}

function createUserHabits() {
  return {
    communicationStyle: {
      preferred: "direct",
      formality: "casual",
      emojiUsage: "moderate",
      language: "zh-CN"
    },
    preferences: {
      responseLength: "concise",
      codeStyle: "typescript",
      timezone: "Asia/Shanghai",
      activeHours: {
        start: "09:00",
        end: "22:00"
      }
    },
    常用命令: [],
    recentTopics: [],
    interactionPatterns: {},
    learnedPreferences: {
      likes: [],
      dislikes: []
    }
  };
}

function createUserMemory() {
  return `# 用户记忆

## 重要人物

## 项目经验

## 偏好习惯

## 重要日期

## 待办事项

## 沟通风格

`;
}

function createWorkRecordHeader() {
  const today = new Date().toISOString().split("T")[0];
  return `# 工作记录

## ${today}

### 任务

### 对话摘要

`;
}

function userProfileExists(userDataPath) {
  return fs.existsSync(getUserProfilePath(userDataPath));
}

function loadUserProfile(userDataPath) {
  const profilePath = getUserProfilePath(userDataPath);
  if (!fs.existsSync(profilePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(profilePath, "utf-8"));
  } catch {
    return null;
  }
}

function saveUserProfile(userDataPath, profile) {
  fs.writeFileSync(getUserProfilePath(userDataPath), JSON.stringify(profile, null, 2), "utf-8");
}

function updateUserLastActive(userDataPath) {
  const profile = loadUserProfile(userDataPath);
  if (!profile) return;
  profile.lastActive = new Date().toISOString();
  saveUserProfile(userDataPath, profile);
}

function initUserFiles(userDataPath, userId, channel, role, profileOverrides = {}) {
  ensureUserSubDirs(userDataPath);

  if (!fs.existsSync(getUserProfilePath(userDataPath))) {
    saveUserProfile(userDataPath, createUserProfile(userId, channel, role, profileOverrides));
  }

  if (!fs.existsSync(getUserHabitsPath(userDataPath))) {
    fs.writeFileSync(getUserHabitsPath(userDataPath), JSON.stringify(createUserHabits(), null, 2), "utf-8");
  }

  if (!fs.existsSync(getUserMemoryPath(userDataPath))) {
    fs.writeFileSync(getUserMemoryPath(userDataPath), createUserMemory(), "utf-8");
  }

  if (!fs.existsSync(getUserWorkRecordsPath(userDataPath))) {
    fs.writeFileSync(getUserWorkRecordsPath(userDataPath), createWorkRecordHeader(), "utf-8");
  }
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim() !== "");
}

function mergeUniqueStrings(...values) {
  return [...new Set(values.flatMap(normalizeStringArray))];
}

function getConfig(event) {
  return event.cfg?.hooks?.internal?.entries?.["user-permissions"]?.config
    || event.cfg?.hooks?.internal?.entries?.userPermissions?.config
    || {};
}

function getRoleTemplates(config) {
  const configured = config.roleTemplates || {};
  const templates = {};

  for (const [roleName, defaults] of Object.entries(DEFAULT_ROLE_TEMPLATES)) {
    const override = configured[roleName] || {};
    templates[roleName] = {
      allowedTools: mergeUniqueStrings(defaults.allowedTools, override.allowedTools),
      allowedDir: override.allowedDir || defaults.allowedDir,
      blockedPatterns: mergeUniqueStrings(defaults.blockedPatterns, override.blockedPatterns)
    };
  }

  for (const [roleName, roleConfig] of Object.entries(configured)) {
    if (templates[roleName]) continue;
    templates[roleName] = {
      allowedTools: mergeUniqueStrings(roleConfig.allowedTools),
      allowedDir: roleConfig.allowedDir,
      blockedPatterns: mergeUniqueStrings(roleConfig.blockedPatterns)
    };
  }

  return templates;
}

function getUserRules(config) {
  const rules = [];

  for (const adminId of normalizeStringArray(config.adminIds)) {
    rules.push({
      name: `legacy-admin:${adminId}`,
      enabled: true,
      role: "admin",
      match: { userIds: [adminId] }
    });
  }

  if (Array.isArray(config.userRules)) {
    rules.push(...config.userRules);
  }

  return rules.filter((rule) => rule && rule.enabled !== false);
}

function matchUserRule(rule, context, userId, channel) {
  const match = rule.match || {};
  const metadata = context.metadata || {};
  const channelUser = `${channel}:${userId}`;

  const userIds = normalizeStringArray(match.userIds);
  if (userIds.length > 0 && !userIds.includes(userId)) return false;

  const channels = normalizeStringArray(match.channels);
  if (channels.length > 0 && !channels.includes(channel)) return false;

  const channelUsers = normalizeStringArray(match.channelUsers);
  if (channelUsers.length > 0 && !channelUsers.includes(channelUser)) return false;

  const prefixes = normalizeStringArray(match.userIdPrefixes);
  if (prefixes.length > 0 && !prefixes.some((prefix) => userId.startsWith(prefix))) return false;

  if (typeof match.userIdRegex === "string" && match.userIdRegex) {
    const regex = new RegExp(match.userIdRegex);
    if (!regex.test(userId)) return false;
  }

  if (match.metadata && typeof match.metadata === "object") {
    for (const [key, allowedValues] of Object.entries(match.metadata)) {
      const values = normalizeStringArray(allowedValues);
      if (values.length === 0) continue;
      if (!values.includes(String(metadata[key] || ""))) return false;
    }
  }

  return true;
}

function resolveUserRule(context, userId, channel, config) {
  return getUserRules(config).find((rule) => matchUserRule(rule, context, userId, channel)) || null;
}

function determineRole(userId, adminIds = [], userRules = [], channel = "unknown", context = {}) {
  const legacyRule = resolveUserRule(context, userId, channel, { adminIds, userRules });
  return legacyRule?.role || "user";
}

function buildUserDataPath(config, channel, userId, rule, agentId) {
  const userDataDir = resolveTemplatePath(config.userDataDir || "~/.openclaw/users", {
    agentId
  });
  const explicitDir = rule?.userDataDir || rule?.allowedDir;

  if (explicitDir && explicitDir !== "~") {
    return resolveTemplatePath(explicitDir, { agentId });
  }

  return path.join(userDataDir, `${sanitizePathSegment(channel)}_${sanitizePathSegment(userId)}`);
}

function getUserPermissions(role, userId, channel, config, rule = null, agentId = "wukong") {
  const roleTemplates = getRoleTemplates(config);
  const roleConfig = roleTemplates[role] || roleTemplates.user || {};
  const userDataPath = buildUserDataPath(config, channel, userId, rule, agentId);

  return {
    agentId,
    userId,
    channel,
    role,
    ruleName: rule?.name || null,
    allowedTools: mergeUniqueStrings(roleConfig.allowedTools, rule?.allowedTools),
    allowedDir: rule?.allowedDir || roleConfig.allowedDir || userDataPath,
    blockedPatterns: mergeUniqueStrings(
      config.blockedPatterns,
      roleConfig.blockedPatterns,
      rule?.blockedPatterns
    ),
    userDataPath,
    profile: rule?.profile || null
  };
}

function getLogDir(config = {}, agentId = "wukong") {
  const logDir = resolveTemplatePath(
    config.logDir || path.join(os.homedir(), ".openclaw", "logs", "security"),
    { agentId }
  );
  ensureDir(logDir);
  return logDir;
}

function logSecurityEvent(config, agentId, eventType, userId, channel, detail) {
  const logFile = path.join(getLogDir(config, agentId), "user-permissions.log");
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${eventType}] ${channel}:${userId} - ${detail}\n`;
  fs.appendFileSync(logFile, logEntry);
  console.log(`[user-permissions] ${logEntry.trim()}`);
}

const handler = async (event) => {
  if (event.type !== "message" || event.action !== "received") return;

  const context = event.context || {};
  const content = context.content || "";
  const userId = getUserIdFromContext(context);
  const channel = getChannelFromContext(context);
  const config = getConfig(event);
  const agentId = getAgentIdFromEvent(event);
  const rule = resolveUserRule(context, userId, channel, config);
  const role = rule?.role || config.defaultRole || "user";
  const permissions = getUserPermissions(role, userId, channel, config, rule, agentId);

  if (isBlockedContent(content, permissions.blockedPatterns)) {
    logSecurityEvent(config, agentId, "block", userId, channel, `Blocked by ${permissions.ruleName || role}: ${String(content).substring(0, 80)}`);
    if (Array.isArray(event.messages)) {
      event.messages.push("抱歉，此请求包含敏感内容，无法处理。如需帮助，请联系系统管理员。");
    }
    return;
  }

  ensureDir(permissions.userDataPath);

  if (!userProfileExists(permissions.userDataPath)) {
    initUserFiles(permissions.userDataPath, userId, channel, role, permissions.profile || {});
    logSecurityEvent(config, agentId, "init", userId, channel, `Created user directory with rule ${permissions.ruleName || role}`);
  } else {
    updateUserLastActive(permissions.userDataPath);
  }

  context._userPermissions = permissions;
  logSecurityEvent(config, agentId, "role", userId, channel, `Role: ${role}${permissions.ruleName ? ` (${permissions.ruleName})` : ""}`);
  console.log(`[user-permissions] Agent ${agentId} user ${channel}:${userId} role=${role} rule=${permissions.ruleName || "default"} path=${permissions.userDataPath}`);
};

module.exports = {
  DEFAULT_BLOCKED_PATTERNS,
  DEFAULT_ROLE_TEMPLATES,
  getUserIdFromContext,
  getChannelFromContext,
  isBlockedContent,
  determineRole,
  resolvePath,
  userProfileExists,
  loadUserProfile,
  saveUserProfile,
  createUserProfile,
  createUserHabits,
  createUserMemory,
  createWorkRecordHeader,
  initUserFiles,
  getUserPermissions,
  getRoleTemplates,
  getUserRules,
  matchUserRule,
  resolveUserRule,
  default: handler
};
