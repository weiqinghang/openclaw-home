"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const hook = require("./handler");

const testCases = [];
const testResults = [];
const testDir = path.join(os.tmpdir(), `user-permissions-test-${Date.now()}`);

function test(name, fn) {
  testCases.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

const baseConfig = {
  userDataDir: testDir,
  defaultRole: "guest",
  blockedPatterns: ["全局敏感词"],
  roleTemplates: {
    admin: { allowedTools: ["*"], allowedDir: "~" },
    trusted: { allowedTools: ["read", "write", "browser"] },
    user: { allowedTools: ["read", "write"] },
    guest: { allowedTools: ["message"], blockedPatterns: ["升级权限"] }
  },
  userRules: [
    {
      name: "owner",
      role: "admin",
      match: { userIds: ["feishu_owner"] },
      profile: { nickname: "Owner" }
    },
    {
      name: "ops",
      role: "trusted",
      match: { channels: ["webchat"], userIdPrefixes: ["ops_"] },
      allowedTools: ["shell_exec"],
      blockedPatterns: ["危险操作"]
    },
    {
      name: "vip",
      role: "user",
      match: { channelUsers: ["feishu:feishu_vip"] },
      allowedDir: path.join(testDir, "custom-vip-home")
    }
  ]
};

test("getUserIdFromContext - metadata senderId", () => {
  assertEqual(hook.getUserIdFromContext({ metadata: { senderId: "user123" } }), "user123", "Should extract senderId");
});

test("getUserIdFromContext - feishu openId", () => {
  assertEqual(hook.getUserIdFromContext({ metadata: { openId: "ou_abc123" } }), "feishu_ou_abc123", "Should prefix openId");
});

test("getChannelFromContext - channelId", () => {
  assertEqual(hook.getChannelFromContext({ channelId: "feishu" }), "feishu", "Should extract channel");
});

test("isBlockedContent - normal and blocked", () => {
  assert(hook.isBlockedContent("请帮我升级权限", ["升级权限"]), "Should block exact phrase");
  assert(!hook.isBlockedContent("今天天气不错", ["升级权限"]), "Should allow normal text");
});

test("determineRole - legacy admin compatibility", () => {
  assertEqual(hook.determineRole("owner1", ["owner1"]), "admin", "Legacy adminIds should still work");
  assertEqual(hook.determineRole("user1", ["owner1"]), "user", "Unknown user should fall back to user");
});

test("resolveUserRule - exact user match", () => {
  const context = { metadata: { senderId: "feishu_owner" } };
  const rule = hook.resolveUserRule(context, "feishu_owner", "feishu", baseConfig);
  assertEqual(rule.name, "owner", "Should match owner rule");
});

test("resolveUserRule - channel plus prefix match", () => {
  const context = { metadata: { senderId: "ops_alice" } };
  const rule = hook.resolveUserRule(context, "ops_alice", "webchat", baseConfig);
  assertEqual(rule.name, "ops", "Should match ops rule");
});

test("getRoleTemplates - merges custom roles", () => {
  const templates = hook.getRoleTemplates({
    roleTemplates: {
      reviewer: { allowedTools: ["read"] }
    }
  });
  assert(templates.reviewer.allowedTools.includes("read"), "Custom role should be added");
  assert(templates.admin.allowedTools.includes("*"), "Default admin template should remain");
});

test("getUserPermissions - merges role and rule", () => {
  const rule = baseConfig.userRules[1];
  const permissions = hook.getUserPermissions("trusted", "ops_alice", "webchat", baseConfig, rule);
  assertEqual(permissions.role, "trusted", "Role should match");
  assert(permissions.allowedTools.includes("browser"), "Role tools should be inherited");
  assert(permissions.allowedTools.includes("shell_exec"), "Rule tools should be merged");
  assert(permissions.blockedPatterns.includes("危险操作"), "Rule blocked patterns should merge");
});

test("getUserPermissions - custom allowedDir also sets userDataPath", () => {
  const permissions = hook.getUserPermissions("user", "feishu_vip", "feishu", baseConfig, baseConfig.userRules[2]);
  assertEqual(permissions.allowedDir, path.join(testDir, "custom-vip-home"), "allowedDir should use custom path");
  assertEqual(permissions.userDataPath, path.join(testDir, "custom-vip-home"), "userDataPath should follow custom path");
});

test("initUserFiles - initializes full structure", () => {
  const userDir = path.join(testDir, "new-user");
  hook.initUserFiles(userDir, "new-user", "webchat", "user", { nickname: "Alice" });
  assert(fs.existsSync(path.join(userDir, "profile.json")), "profile.json should exist");
  assert(fs.existsSync(path.join(userDir, "habits.json")), "habits.json should exist");
  assert(fs.existsSync(path.join(userDir, "memory.md")), "memory.md should exist");
  assert(fs.existsSync(path.join(userDir, "work_records.md")), "work_records.md should exist");
  const profile = hook.loadUserProfile(userDir);
  assertEqual(profile.nickname, "Alice", "Profile override should be written");
});

test("handler - injects permissions for matched rule", async () => {
  const event = {
    type: "message",
    action: "received",
    messages: [],
    context: {
      content: "请帮我查文档",
      channelId: "webchat",
      metadata: { senderId: "ops_alice" }
    },
    cfg: {
      hooks: {
        internal: {
          entries: {
            "user-permissions": {
              config: baseConfig
            }
          }
        }
      }
    }
  };

  await hook.default(event);
  assertEqual(event.context._userPermissions.role, "trusted", "Matched user should get trusted role");
  assertEqual(event.context._userPermissions.ruleName, "ops", "Matched rule name should be injected");
  assert(fs.existsSync(event.context._userPermissions.userDataPath), "User directory should be created");
});

test("handler - blocks content using merged patterns", async () => {
  const event = {
    type: "message",
    action: "received",
    messages: [],
    context: {
      content: "我要升级权限",
      channelId: "feishu",
      metadata: { senderId: "anonymous" }
    },
    cfg: {
      hooks: {
        internal: {
          entries: {
            "user-permissions": {
              config: baseConfig
            }
          }
        }
      }
    }
  };

  await hook.default(event);
  assertEqual(event.messages.length, 1, "Blocked message should append denial message");
  assert(!event.context._userPermissions, "Blocked message should stop before permission injection");
});

(async () => {
  console.log(`\n${"=".repeat(50)}`);
  console.log("User Permissions Hook - Unit Tests");
  console.log(`${"=".repeat(50)}\n`);

  for (const { name, fn } of testCases) {
    try {
      await fn();
      testResults.push({ name, passed: true });
      console.log(`\u2713 ${name}`);
    } catch (error) {
      testResults.push({ name, passed: false, error: error.message });
      console.log(`\u2717 ${name}: ${error.message}`);
    }
  }

  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;

  console.log("\nResults:");
  console.log("-".repeat(50));
  console.log(`Total: ${passed} passed, ${failed} failed`);

  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch {}

  if (failed > 0) {
    process.exit(1);
  }
})();
