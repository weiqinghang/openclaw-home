# 副作用测试清场指引

适用场景：

- 反复测试某个 Agent
- 该测试会读取、写入、沉淀状态
- 你希望“重新开始”，而不是“继续上一轮”

## 原则

只做其中一半清理是无效的。

必须同时清：

1. **workspace 副作用**
2. **session 副作用**

## 为什么 `/new` 不够

`/new` 不是生产级硬重置。  
它不会保证清掉：

- session store
- session jsonl
- workspace memory
- 上一轮任务态

所以对副作用测试，`/new` 不能替代清场。

## 有效清理位置

### 1. workspace

重点清：

- `~/Documents/OpenClawData/agents/{agentId}/workspace/memory/`
- 本轮测试生成的临时工件
- 本轮测试生成的草稿、台账、缓存

### 2. session

重点清：

- `~/Documents/OpenClawData/agents/{agentId}/sessions/sessions.json`
- `~/.openclaw/agents/{agentId}/sessions/*.jsonl`

说明：

- `sessions.json` 负责 session 索引与会话映射
- `*.jsonl` 负责真实对话历史与任务态延续

只清一个，不清另一个，效果不完整。

## 推荐流程

1. 停止新测试消息输入
2. 清 `workspace/memory/` 和本轮临时工件
3. 清 `sessions/sessions.json`
4. 清 `~/.openclaw/agents/{agentId}/sessions/*.jsonl`
5. 重启 gateway
6. 再开始新一轮验证

## 对龟丞相的实际路径

workspace：

- `~/Documents/OpenClawData/agents/guichengxiang/workspace/memory/`

session：

- `~/Documents/OpenClawData/agents/guichengxiang/sessions/sessions.json`
- `~/.openclaw/agents/guichengxiang/sessions/*.jsonl`

## 风险说明

不清 session 的后果：

- Agent 继续沿用旧任务态
- 明明没做新检查，却复述旧结论
- 人类误以为它刚完成本轮工作

## 一句话原则

**需要重跑副作用测试时，清 workspace，不等于清 session；两边都要清。**
