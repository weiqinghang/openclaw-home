#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const HOME = os.homedir();
const ROOT = path.join(HOME, ".openclaw");
const OLD_USERS_DIR = path.join(ROOT, "users");
const OLD_SECURITY_LOG = path.join(ROOT, "logs", "security", "user-permissions.log");
const GATEWAY_LOG = path.join(ROOT, "logs", "gateway.log");
const DATA_ROOT = path.join(HOME, "Documents", "OpenClawData");
const AGENTS_ROOT = path.join(DATA_ROOT, "agents");
const SHARED_USERS_ROOT = path.join(DATA_ROOT, "shared-users");
const LEGACY_ROOT = path.join(DATA_ROOT, "legacy");

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function listDirs(root) {
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(root, entry.name));
  } catch {
    return [];
  }
}

function mergeUniqueStrings(...values) {
  return [...new Set(values.flatMap((value) => Array.isArray(value) ? value : []))];
}

function extractUserMappings() {
  const mappings = new Map();
  const text = readText(GATEWAY_LOG);
  const re = /Agent\s+([a-zA-Z0-9._-]+)\s+user\s+[^\s]+\s+role=.*?\s+path=(\/Users\/claw\/\.openclaw\/users\/([^\s]+))/g;
  for (const match of text.matchAll(re)) {
    mappings.set(match[3], match[1]);
  }
  return mappings;
}

function copyDirContents(sourceDir, targetDir) {
  ensureDir(targetDir);
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function parseLegacyUserMd(userDir) {
  const userMd = readText(path.join(userDir, "USER.md"));
  const nameMatch = userMd.match(/\*\*Name:\*\*\s*(.+)/);
  const callMatch = userMd.match(/\*\*What to call them:\*\*\s*(.+)/);
  const timezoneMatch = userMd.match(/\*\*Timezone:\*\*\s*([^\n]+)/);
  return {
    displayName: nameMatch ? nameMatch[1].trim() : "",
    preferredName: callMatch ? callMatch[1].trim() : "",
    timezone: timezoneMatch ? timezoneMatch[1].trim() : ""
  };
}

function buildSharedProfile(userDir, dirName) {
  const [channel, ...rest] = dirName.split("_");
  const userId = rest.join("_") || dirName;
  const profile = readJson(path.join(userDir, "profile.json"));
  const habits = readJson(path.join(userDir, "habits.json"));
  const legacy = parseLegacyUserMd(userDir);
  const now = new Date().toISOString();
  return {
    userKey: `${channel}:${userId}`,
    userId,
    channel,
    displayName: profile?.displayName || profile?.nickname || legacy.displayName || "",
    preferredName: profile?.preferredName || profile?.nickname || legacy.preferredName || "",
    language: habits?.communicationStyle?.language || profile?.settings?.language || "zh-CN",
    timezone: habits?.preferences?.timezone || profile?.settings?.timezone || legacy.timezone || "Asia/Shanghai",
    identityTags: mergeUniqueStrings(profile?.identityTags),
    longTermPreferences: mergeUniqueStrings(
      profile?.longTermPreferences,
      habits?.learnedPreferences?.likes,
      (habits?.learnedPreferences?.dislikes || []).map((item) => `avoid:${item}`)
    ),
    stableGoals: mergeUniqueStrings(profile?.stableGoals),
    updatedAt: profile?.lastActive || now,
    sources: [
      {
        agentId: "migration",
        updatedAt: now,
        fields: [
          "displayName",
          "preferredName",
          "language",
          "timezone",
          "identityTags",
          "longTermPreferences",
          "stableGoals"
        ]
      }
    ]
  };
}

function migrateUsers() {
  const mappings = extractUserMappings();
  const migrated = [];
  const unmapped = [];

  for (const userDir of listDirs(OLD_USERS_DIR)) {
    const dirName = path.basename(userDir);
    let agentId = mappings.get(dirName);

    if (!agentId) {
      for (const agentDir of listDirs(AGENTS_ROOT)) {
        const candidate = path.join(agentDir, "users", dirName);
        if (fs.existsSync(candidate)) {
          agentId = path.basename(agentDir);
          break;
        }
      }
    }

    if (!agentId) {
      unmapped.push(dirName);
      continue;
    }

    const targetDir = path.join(AGENTS_ROOT, agentId, "users", dirName);
    copyDirContents(userDir, targetDir);
    const sharedProfile = buildSharedProfile(targetDir, dirName);
    writeJson(path.join(SHARED_USERS_ROOT, dirName, "shared_profile.json"), sharedProfile);
    migrated.push({ dirName, agentId, targetDir });
  }

  return { migrated, unmapped };
}

function migrateSecurityLog() {
  const text = readText(OLD_SECURITY_LOG);
  if (!text) return { migratedLines: 0, legacyLines: 0 };

  let migratedLines = 0;
  let legacyLines = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const match = line.match(/Agent\s+([a-zA-Z0-9._-]+)\s+user/);
    if (match) {
      const target = path.join(AGENTS_ROOT, match[1], "logs", "security", "user-permissions.log");
      ensureDir(path.dirname(target));
      fs.appendFileSync(target, `${line}\n`, "utf8");
      migratedLines += 1;
      continue;
    }

    const legacyTarget = path.join(LEGACY_ROOT, "security", "user-permissions.log");
    ensureDir(path.dirname(legacyTarget));
    fs.appendFileSync(legacyTarget, `${line}\n`, "utf8");
    legacyLines += 1;
  }

  return { migratedLines, legacyLines };
}

function main() {
  ensureDir(SHARED_USERS_ROOT);
  const userResult = migrateUsers();
  const logResult = migrateSecurityLog();
  console.log(JSON.stringify({ users: userResult, logs: logResult }, null, 2));
}

main();
