# OpenClaw ACP Runtime 本地补丁

## 目的

记录 ACP spawnedBy 兼容问题、历史本地补丁，以及升级后如何判断是否仍需补丁。

历史问题是：

- `sessions_spawn(runtime="acp")`
- 给 ACP session 写入 `spawnedBy`
- 但 gateway `sessions.patch` 只允许 `subagent:*` 带 `spawnedBy`

导致的报错：

- `spawnedBy is only supported for subagent:* sessions`

## 当前判断

这是 **OpenClaw 上游实现冲突**，不是本仓库多 Agent / 多应用 / 多用户架构自身导致。

截至当前实测：

- `OpenClaw 2026.3.13` 已通过本仓库 ACP 验收
- `sessions_spawn(runtime="acp")` 的 spawnedBy 校验已是**上游修复态**
- `scripts/openclaw-acp-spawnedby-patch.js status` 在该版本会返回 `upstream_fixed`
- 因此当前版本**不需要再重放旧补丁**

## 补丁脚本

- 脚本：[`scripts/openclaw-acp-spawnedby-patch.js`](/Users/claw/.openclaw/scripts/openclaw-acp-spawnedby-patch.js)
- 目标文件：当前安装目录下的 `gateway-cli-*.js`

脚本能力：

- `status`：检查是 `needs_patch`、`patched` 还是 `upstream_fixed`
- `apply`：重放补丁
- `revert`：回滚补丁

## 配置前提

若要让 Agent 真正取回 ACP 子会话结果，还需要允许跨 agent 的 session 可见性：

```json
{
  "tools": {
    "agentToAgent": {
      "enabled": true,
      "allow": ["*"]
    },
    "sessions": {
      "visibility": "all"
    }
  }
}
```

否则即使 ACP spawn 成功，父 Agent 仍可能在读取子会话结果时失败。

## 升级后待办

每次执行 `openclaw update` 后，必须检查一次：

1. 先跑状态检查

```bash
node scripts/openclaw-acp-spawnedby-patch.js status
```

2. 再判断官方是否已修复

- 若显示 `upstream_fixed`：
  - 说明上游已修
  - 直接做 ACP 冒烟测试
  - 若通过，则**停用本地补丁**
- 若显示 `needs_patch`：
  - 说明官方尚未修
  - 重新执行本地补丁
- 若显示 `patched`：
  - 说明当前安装里仍是本地补丁态
  - 继续做 ACP 冒烟测试

3. 重放补丁

```bash
node scripts/openclaw-acp-spawnedby-patch.js apply
```

4. 冒烟验证

至少验证两项：

- 项目级 ACP：`./scripts/acpx-codex.sh exec "回复 OK"`
- Agent 内部 runtime ACP：让 `guichengxiang` 或 `wukong` 转交一次 Codex

## 取消本地补丁的条件

满足以下两条时，取消本地补丁：

1. 升级后出现 `upstream_fixed`
2. Agent 内部 runtime ACP 冒烟测试稳定通过

若已确认上游修复，可执行：

```bash
node scripts/openclaw-acp-spawnedby-patch.js revert
```

## 风险说明

- 这是对本机 OpenClaw 安装目录的本地补丁
- 升级后可能被覆盖
- 因此必须保留“检查 -> 判断 -> 重放 -> 验证”流程
