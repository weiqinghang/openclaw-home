# Agent 记忆污染事故记录

## 现象

在龟丞相的重复测试中，用户并未重新要求推进验收盘点，Agent 却直接给出：

> 结论：主线工件已齐，当前唯一关键差距是“稳定性验收证据不足”，还不能把龟丞相从 `🚧 inprogress` 收敛到 `✅ done` 候选。

问题不在这句话是否好听。  
问题在于：**这轮并没有重新做对应工作，但输出看起来像已经重新完成了一轮盘点。**

## 本次结论

这次是 **100% 的旧上下文污染**。  
不是当前 seed 仓库状态推出来的。

原因：

- `docs/00-story-map/index.md`
- `docs/current-iteration.md`

在事后已经被人类回滚。  
因此，这句回复不可能来自“当前仓库真实状态”。

## 污染源定位

主污染源是 **session**，不是当前 workspace 的记忆文件。

### 1. session 是强污染源

当前 session key：

- `agent:guichengxiang:feishu:direct:ou_43a622baabff2e62ff01b47429e92a7a`

对应 session 文件：

- `~/.openclaw/agents/guichengxiang/sessions/7291f1a0-8b1e-42d9-b468-0926f343de8c.jsonl`

这个 session 里，已经存在一次完整的“默认顺序读取 -> 差距盘点 -> 稳定性验收不足”链路。  
后续测试如果没有切断它，Agent 就会继续沿用旧任务态。

### 2. workspace memory 也可能放大问题，但这次不是主源

当前 workspace memory 文件：

- `~/Documents/OpenClawData/agents/guichengxiang/workspace/memory/2026-03-10-0229.md`

它不是这次结论的主来源。  
但在类似场景里，workspace 下的记忆文件仍可能继续放大旧结论。

### 3. `/new` 不是生产级“硬重置”

在飞书里输入 `/new`，不等于：

- 删除 session 文件
- 清空 session store
- 清掉 workspace memory
- 清掉上一轮任务态

所以 `/new` 只能视为**弱重置**，不能当成副作用测试的清场动作。

## 事故本质

这类问题的危险点在于：

- Agent **没有重新做**
- 却 **像已经重新做了**
- 人类又可能基于这句“像做过”的话继续决策

这会导致生产风险：

1. 错误判断项目成熟度
2. 错误推进验收、上线、收敛
3. 错误省略本应重新执行的检查
4. 对 Agent 的执行可信度产生误判

## 经验

当你在测试一个**会产生副作用**的 Agent 时，如果要反复验证，必须同时清两类东西：

1. **工作区副作用**
2. **session 副作用**

只清工作区，不清 session，**不够**。  
只发 `/new`，也**不够**。

## 有效清理点

### 1. 清 workspace 副作用

需要清理的通常是：

- `~/Documents/OpenClawData/agents/{agentId}/workspace/memory/`
- 该 Agent 在 workspace 下新写出的临时工件
- 该轮测试专门生成的草稿、台账、缓存文件

对龟丞相，本次重点路径是：

- `~/Documents/OpenClawData/agents/guichengxiang/workspace/memory/`

### 2. 清 session 副作用

这是关键。

需要清理：

- `~/Documents/OpenClawData/agents/{agentId}/sessions/sessions.json`
- `~/.openclaw/agents/{agentId}/sessions/*.jsonl` 或当前 session 对应的 jsonl

对龟丞相，本次重点路径是：

- `~/Documents/OpenClawData/agents/guichengxiang/sessions/sessions.json`
- `~/.openclaw/agents/guichengxiang/sessions/7291f1a0-8b1e-42d9-b468-0926f343de8c.jsonl`

如果只删 `workspace/memory`，但不删这两个 session 存储点，旧任务态仍会回来。

## 生产指引

对会产生副作用的测试任务，重新验证前应执行：

1. 清本轮测试写出的 workspace memory 和临时工件
2. 清该 Agent 的 session store 与对应 session jsonl
3. 再重启 gateway
4. 再开始新一轮测试

否则就可能出现：

- 明明没做
- 却因旧 session / 旧任务态 / 幻觉式复述
- 导致 Agent 无法按预期继续工作

## 一句话原则

**副作用测试要重跑，workspace 要清，session 也一定要清。**
