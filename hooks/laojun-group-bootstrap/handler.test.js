"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const hook = require("./handler.js");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "laojun-group-bootstrap-"));
const statePath = path.join(tempRoot, "pending.json");
const fakeCreateProject = path.join(tempRoot, "create-project-agent.js");
fs.writeFileSync(fakeCreateProject, "");

const sentMessages = [];
hook.setSpawnRunner((command, args) => {
  if (String(command).includes("with-openclaw-secrets.sh")) {
    sentMessages.push({ command, args });
    return { status: 0, stdout: "", stderr: "" };
  }
  if (command === "node" && args[0] === fakeCreateProject) {
    return { status: 0, stdout: "ok", stderr: "" };
  }
  return { status: 1, stdout: "", stderr: "unexpected command" };
});

function makeConfig() {
  return {
    hooks: {
      internal: {
        entries: {
          "laojun-group-bootstrap": {
            config: {
              ownerUserId: "ou_owner",
              statePath,
              secretWrapper: "/tmp/with-openclaw-secrets.sh",
              createProjectScript: fakeCreateProject,
              agentId: "laojun"
            }
          }
        }
      }
    }
  };
}

async function testPromptOnRestrictedGroup() {
  sentMessages.length = 0;
  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);

  const event = {
    type: "message",
    action: "received",
    agentId: "laojun",
    sessionKey: "agent:laojun:feishu:group:oc_test123456",
    context: {
      chatType: "group",
      metadata: {
        senderId: "ou_owner",
        is_group_chat: true,
        conversation_label: "oc_test123456",
        group_subject: "项目火车"
      }
    },
    cfg: makeConfig()
  };

  await hook.default(event);

  const state = hook.loadState(statePath);
  assert.equal(state.pending.oc_test123456.projectId, "project-123456");
  assert.equal(state.pending.oc_test123456.projectName, "项目火车");
  assert.equal(sentMessages.length, 1);
  assert(sentMessages[0].args.includes("user:ou_owner"));
}

async function testFallbackIdentityForOpaqueGroupName() {
  const identity = hook.deriveProjectIdentity("oc_abcdef123456", "oc_abcdef123456");
  assert.equal(identity.projectId, "project-123456");
  assert.equal(identity.projectName, "项目 123456");
}

async function testDirectConfirmationBootstraps() {
  sentMessages.length = 0;
  hook.saveState(statePath, {
    version: 1,
    pending: {
      oc_test123456: {
        groupId: "oc_test123456",
        ownerUserId: "ou_owner",
        projectId: "alpha",
        projectName: "Alpha",
        status: "pending"
      }
    }
  });

  const event = {
    type: "message",
    action: "received",
    agentId: "laojun",
    context: {
      chatType: "direct",
      metadata: {
        senderId: "ou_owner",
        is_group_chat: false
      },
      content: "确认"
    },
    cfg: makeConfig()
  };

  await hook.default(event);

  const state = hook.loadState(statePath);
  assert.equal(state.pending.oc_test123456.status, "completed");
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0].args[sentMessages[0].args.length - 1], /初始化已完成/);
}

async function main() {
  await testPromptOnRestrictedGroup();
  await testFallbackIdentityForOpaqueGroupName();
  await testDirectConfirmationBootstraps();
  console.log("laojun-group-bootstrap hook tests passed");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
