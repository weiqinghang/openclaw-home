/**
 * User Permissions Hook - 单元测试
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
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
  DEFAULT_BLOCKED_PATTERNS
} from "./handler";

// 测试工具
const testResults: { name: string; passed: boolean; error?: string }[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    testResults.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error: any) {
    testResults.push({ name, passed: false, error: error.message });
    console.log(`✗ ${name}: ${error.message}`);
  }
}

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

// ============================================
// 测试用例
// ============================================

// 创建临时测试目录
const testDir = path.join(os.tmpdir(), `user-permissions-test-${Date.now()}`);

test("getUserIdFromContext - 从 metadata 提取用户ID", () => {
  const context = { metadata: { senderId: "user123" } };
  assertEqual(getUserIdFromContext(context), "user123", "Should extract senderId");
});

test("getUserIdFromContext - 飞书 openId", () => {
  const context = { metadata: { openId: "ou_abc123" } };
  assertEqual(getUserIdFromContext(context), "feishu_ou_abc123", "Should prefix with feishu_");
});

test("getChannelFromContext - 提取渠道", () => {
  const context = { channelId: "feishu" };
  assertEqual(getChannelFromContext(context), "feishu", "Should extract channel");
});

test("isBlockedContent - 拦截敏感词", () => {
  assert(isBlockedContent("帮我修改配置", DEFAULT_BLOCKED_PATTERNS), "Should block 帮我");
  assert(isBlockedContent("sudo rm -rf", DEFAULT_BLOCKED_PATTERNS), "Should block sudo");
  assert(isBlockedContent("让我成为管理员", DEFAULT_BLOCKED_PATTERNS), "Should block 管理员");
});

test("isBlockedContent - 正常内容放行", () => {
  assert(!isBlockedContent("今天天气不错", DEFAULT_BLOCKED_PATTERNS), "Should allow normal content");
  assert(!isBlockedContent("查一下天气", DEFAULT_BLOCKED_PATTERNS), "Should allow 查天气");
});

test("determineRole - 管理员判定", () => {
  const adminIds = ["user1", "user2"];
  assertEqual(determineRole("user1", adminIds), "admin", "Admin should be identified");
  assertEqual(determineRole("user2", adminIds), "admin", "Admin should be identified");
});

test("determineRole - 普通用户判定", () => {
  const adminIds = ["user1"];
  assertEqual(determineRole("user3", adminIds), "user", "Regular user should be identified");
});

test("resolvePath - ~ 路径解析", () => {
  const resolved = resolvePath("~/.openclaw");
  assert(resolved.includes(".openclaw"), "Should resolve ~ to home directory");
});

test("resolvePath - 绝对路径保持不变", () => {
  const resolved = resolvePath("/Users/claw/test");
  assertEqual(resolved, "/Users/claw/test", "Absolute path should stay unchanged");
});

test("createUserProfile - 创建用户画像", () => {
  const profile = createUserProfile("user123", "feishu", "admin");
  assertEqual(profile.userId, "user123", "userId should match");
  assertEqual(profile.channel, "feishu", "channel should match");
  assertEqual(profile.role, "admin", "role should match");
  assert(profile.createdAt, "createdAt should be set");
  assert(profile.lastActive, "lastActive should be set");
});

test("createUserHabits - 创建用户习惯", () => {
  const habits = createUserHabits();
  assertEqual(habits.communicationStyle.preferred, "direct", "communicationStyle should match");
  assertEqual(habits.preferences.responseLength, "concise", "preferences should match");
  assert(Array.isArray(habits.常用命令), "常用命令 should be array");
});

test("createUserMemory - 创建用户记忆模板", () => {
  const memory = createUserMemory();
  assert(memory.includes("# 用户记忆"), "Should have header");
  assert(memory.includes("## 重要人物"), "Should have section");
  assert(memory.includes("## 偏好习惯"), "Should have section");
});

test("createWorkRecordHeader - 创建工作记录模板", () => {
  const header = createWorkRecordHeader();
  assert(header.includes("# 工作记录"), "Should have header");
  assert(header.includes("## "), "Should have date section");
});

test("saveUserProfile and loadUserProfile - 保存和加载", () => {
  const testUserDir = path.join(testDir, "test_user");
  fs.mkdirSync(testUserDir, { recursive: true });
  
  const profile = createUserProfile("test_user", "webchat", "user");
  profile.nickname = "测试用户";
  
  saveUserProfile(testUserDir, profile);
  
  const loaded = loadUserProfile(testUserDir);
  assert(loaded !== null, "Profile should be loaded");
  assertEqual(loaded!.userId, "test_user", "userId should match");
  assertEqual(loaded!.nickname, "测试用户", "nickname should match");
});

test("userProfileExists - 检查 profile 是否存在", () => {
  const testUserDir = path.join(testDir, "test_exists");
  fs.mkdirSync(testUserDir, { recursive: true });
  
  assert(!userProfileExists(testUserDir), "Should return false when profile doesn't exist");
  
  const profile = createUserProfile("test", "webchat", "user");
  saveUserProfile(testUserDir, profile);
  
  assert(userProfileExists(testUserDir), "Should return true when profile exists");
});

test("getUserPermissions - 管理员权限", () => {
  const permissions = getUserPermissions("admin", "user1", "feishu", {
    userDataDir: "~/.openclaw/users"
  });
  
  assertEqual(permissions.role, "admin", "role should be admin");
  assertEqual(permissions.allowedTools[0], "*", "admin should have all tools");
  assertEqual(permissions.allowedDir, "~", "admin can access home dir");
});

test("getUserPermissions - 普通用户权限", () => {
  const permissions = getUserPermissions("user", "user1", "feishu", {
    userDataDir: "~/.openclaw/users"
  });
  
  assertEqual(permissions.role, "user", "role should be user");
  assert(permissions.allowedTools.includes("web_search"), "should have web_search");
  assert(!permissions.allowedTools.includes("*"), "should not have all tools");
});

test("initUserFiles - 初始化用户文件结构", () => {
  const testUserDir = path.join(testDir, "new_user");
  
  initUserFiles(testUserDir, "new_user", "webchat", "admin");
  
  // 检查目录结构
  assert(fs.existsSync(path.join(testUserDir, "profile.json")), "profile.json should exist");
  assert(fs.existsSync(path.join(testUserDir, "habits.json")), "habits.json should exist");
  assert(fs.existsSync(path.join(testUserDir, "memory.md")), "memory.md should exist");
  assert(fs.existsSync(path.join(testUserDir, "work_records.md")), "work_records.md should exist");
  assert(fs.existsSync(path.join(testUserDir, "files/uploads")), "files/uploads should exist");
  assert(fs.existsSync(path.join(testUserDir, "files/downloads")), "files/downloads should exist");
  assert(fs.existsSync(path.join(testUserDir, "sessions")), "sessions should exist");
  
  // 检查 profile 内容
  const profile = loadUserProfile(testUserDir);
  assert(profile !== null, "Profile should be loaded");
  assertEqual(profile!.userId, "new_user", "userId should match");
  assertEqual(profile!.channel, "webchat", "channel should match");
});

// ============================================
// 运行测试
// ============================================

console.log("\n" + "=".repeat(50));
console.log("User Permissions Hook - 单元测试");
console.log("=".repeat(50) + "\n");

// 运行测试
// 注意：initUserFiles 测试需要先运行，因为它依赖 createUserProfile 等函数

console.log("\n测试结果:");
console.log("-".repeat(50));

const passed = testResults.filter(r => r.passed).length;
const failed = testResults.filter(r => !r.passed).length;

console.log(`\n总计: ${passed} 通过, ${failed} 失败`);

// 清理测试目录
try {
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log(`\n测试目录已清理: ${testDir}`);
} catch (e) {
  // ignore
}

if (failed > 0) {
  process.exit(1);
}
