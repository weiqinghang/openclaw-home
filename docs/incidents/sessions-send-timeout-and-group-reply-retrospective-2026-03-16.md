# sessions_send 超时与群聊消息投递复盘

日期：2026-03-16

## 1. sessions_send 120 秒超时问题

### 现象

老君在飞书群中调用 `sessions_send(agent:star-steps:main)` 时，始终使用 `timeoutSeconds: 120` 而非人格文件中要求的 `600`。导致项目维护 Agent 还在执行中就被超时截断。

### 根因

三层缓存同时生效，必须全部清除才能让人格文件变更生效：

1. **workspace 文件未同步**：修改了 `agents/laojun/TOOLS.md` 后，必须执行 `node scripts/sync-agent-workspace.js laojun` 把文件同步到 `~/Documents/OpenClawData/agents/laojun/workspace/`。
2. **`systemSent` 标记为 `true`**：在 `~/Documents/OpenClawData/agents/laojun/sessions/sessions.json` 中，活跃 session 的 `systemSent` 一旦为 `true`，OpenClaw 就跳过系统提示词重新生成，继续使用旧版本。
3. **Gateway 进程内文件缓存**：Gateway 进程在首次加载 workspace 文件后缓存在内存中，即使磁盘文件已变、`systemSent` 已重置，Gateway 仍可能使用缓存版本。

### 修复三步法（必须全部执行）

```bash
# 1. 同步 workspace 文件
node scripts/sync-agent-workspace.js laojun

# 2. 重置 systemSent（用 Python 精确修改 JSON）
python3 -c "
import json
p = '$HOME/Documents/OpenClawData/agents/laojun/sessions/sessions.json'
with open(p) as f: d = json.load(f)
for s in d.get('sessions', {}).values():
    s['systemSent'] = False
with open(p, 'w') as f: json.dump(d, f, indent=2)
"

# 3. 重启 Gateway
launchctl bootout gui/$(id -u)/ai.openclaw.gateway
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

### 验证

修复后，Gateway 日志中 `agent.wait` 的 `timeoutMs` 从 `120002` 变为 `600000`，确认修复生效。

### 关键代码证据

- **`agent.wait` 无硬上限**（`gateway-cli-CuZs0RlJ.js:9277`）：
  ```javascript
  const timeoutMs = typeof p.timeoutMs === "number" && Number.isFinite(p.timeoutMs)
    ? Math.max(0, Math.floor(p.timeoutMs)) : 3e4;
  ```
  只有下限（0）和默认值（30s），无上限裁剪。

- **`sessions_send` 直传 timeoutMs**（`auth-profiles-DRjqKE3G.js:86311`）：
  ```javascript
  const wait = await callGateway({
      method: "agent.wait",
      params: { runId, timeoutMs },
      timeoutMs: timeoutMs + 2e3
  });
  ```
  没有 `Math.min` 裁剪。

- **对比 `sessions_spawn` 有 120s 硬上限**：
  ```javascript
  Math.min(..., 12e4)  // SUBAGENT_ANNOUNCE_TIMEOUT_MS = 120000
  ```
  这是 `sessions_spawn` 的限制，不是 `sessions_send` 的。

## 2. 飞书群聊文本消息批量返回问题

### 现象

老君执行过程中，截图能实时逐张发到群里，但文本消息全部在 Agent run 结束后一次性集中返回（十几条一起出现）。

### 根因

两个独立机制造成的：

**文本消息**：`queuedFinal = true`，所有文本回复进入 reply queue，等 Agent run 完成后统一 flush。

**截图消息**：工具摘要（tool summary）中含 `mediaUrl` 的消息有豁免路径：
```javascript
// auth-profiles-DRjqKE3G.js:131451
const shouldSendToolSummaries = ctx.ChatType !== "group" && ctx.CommandSource !== "native";

// 但图片有豁免 (line 131481):
if (!(Boolean(payload.mediaUrl) || (payload.mediaUrls?.length ?? 0) > 0)) return null;
return { ...payload, text: void 0 };  // 只发图片，剥离文本
```

所以群聊中：
- 文本 tool summary → 被 `shouldSendToolSummaries = false` 拦截
- 图片 tool summary → 豁免通过，实时投递
- 最终回复文本 → 等 run 结束后 flush

### 当前状态

未修改源码。如要修改，只需把 `shouldSendToolSummaries` 改为 `true` 或移除 group 判断，但这会导致群聊中每次工具调用都发送文本摘要，噪音较大。

## 3. `message` 工具即时回复尝试

### 目标

让老君在收到用户消息后立即回复一句确认（如"收到，正在处理"），然后再调用 `sessions_send` 等待项目维护 Agent。

### 做法

在 `AGENTS.md` 和 `TOOLS.md` 中加入"即时响应规则"，要求第一步必须用 `message` 工具发确认。

### 效果

LLM 不稳定遵守。有时会先调 `sessions_send` 再用 `message`，有时直接跳过 `message`。纯靠 prompt engineering 无法保证。

### 可选方案

| 方案 | 可行性 | 备注 |
|------|--------|------|
| 钩子 hook | 不可行 | 只能在 tool 调用前后触发，不能主动发消息 |
| 心跳 heartbeat | 不可行 | 设计用途是长任务保活，不是发业务消息 |
| 源码改 `queuedFinal` | 可行 | 但会放开所有文本消息实时投递，噪音问题 |
| 新增 `onRunStart` 钩子 | 理想 | 需要 OpenClaw 框架支持 |

## 4. Gateway 日志时间戳 vs 文件系统时间戳

### 发现

Gateway 日志中的时间戳可能滞后于文件系统时间戳。例如：
- 文件系统显示 19:39 完成写入
- Gateway 日志在 19:42 才打印对应条目

### 原因

Gateway 日志是缓冲刷写的。项目维护 Agent 完成工作后，其输出在 `sessions_send` 返回链路上经过多层传递，Gateway 侧的日志条目是在收到返回后才写入的。

### 结论

以**文件系统时间戳为准**，不要用 Gateway 日志时间戳判断实际执行完成时间。
