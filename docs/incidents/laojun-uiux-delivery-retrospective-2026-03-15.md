# 老君 UI/UX 专家交付链路复盘

日期：2026-03-15

适用范围：

- 飞书群里由老君收敛需求，再路由给 `uiux-designer`
- 共享 Claude 专家通过 ACP / `acpx` 执行
- 需要交付原型、设计说明、页面文件等项目工件

## 结论

这次问题不是单点故障，而是四层问题叠加：

1. 路由口径和实际执行不一致
2. 老君协调员边界不硬，异常时会自己下场
3. 长任务回执是批处理式，不是 checkpoint 式
4. 大文件 / 长回合执行策略不稳，容易超时或中止

最终表现为：

- 群里说“已经派给 `uiux-designer`”
- 实际底层未稳定走到具名专家链路
- 部分文件由老君自己写入
- 回执积压后集中刷屏
- 用户难以判断“谁在干活、做到哪一步、是否完成”

后续排查又确认了两类架构性误区：

5. 项目维护 Agent 的“存在”与“可调用”判定口径不清
6. `sessions_send` 的工具语义与自动播报链路会制造额外噪音

## 现象

### 1. 前台现象

- 老君口头说已经派给 `uiux-designer`
- 后续又说专家超时、要自己接手
- 群里阶段性无回复，随后一次性刷出多条
- 目录里已有部分文件，但老君前面却说“没完成”

### 2. 实际结果

- `uiux-designer` 没有稳定完成整批落盘
- 老君主会话实际写入了部分项目文件
- 最终主会话在长回合中 `aborted`
- 用户看到的是“部分产物存在，但状态认知错乱”

## 时间线

### 阶段 A：需求收敛与拆分

老君正确完成了：

- 读取群绑定
- 读取 `high-fi-brief.md`
- 给出模块化目录结构与分批交付方案

关键证据：

- [9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl](/Users/claw/.openclaw/agents/laojun/sessions/9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl#L5)
- [9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl](/Users/claw/.openclaw/agents/laojun/sessions/9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl#L12)

这一步基本符合预期。

### 阶段 B：确认后进入执行

用户确认“直接搞起吧”后，老君并未稳定只做协调员，而是开始研究执行入口：

- 读取 [`acpx-uiux.sh`](/Users/claw/.openclaw/scripts/acpx-uiux.sh)
- 读取 `acp-router` 技能说明

关键证据：

- [9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl](/Users/claw/.openclaw/agents/laojun/sessions/9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl#L14)
- [9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl](/Users/claw/.openclaw/agents/laojun/sessions/9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl#L15)

说明：

- 老君没有把自己严格限制在“只发任务包、只等回执”
- 执行入口仍有被协调员自行探索、绕路、接管的空间

### 阶段 C：专家链路失真

前台口径是“派给 `uiux-designer`”，但实际执行链路并不稳定：

- 有时退化成 generic `claude`
- 有时退化成老君自己的 subagent / 主会话执行
- 有时 `acpx` 会话完成了设计决策，却没有稳定写盘

结果：

- “谁在执行”与“群里怎么说”并不一致
- 用户无法通过前台话术判断真实执行者

### 阶段 D：长回合直接写文件

这次最关键的问题是：

- 老君在同一长回合内开始直接 `write` 项目文件
- 已落地文件包括：
  - [variables.css](/Users/claw/Documents/OpenClawData/projects/star-steps/prototype/high-fi/css/variables.css)
  - [base.css](/Users/claw/Documents/OpenClawData/projects/star-steps/prototype/high-fi/css/base.css)
  - [components.css](/Users/claw/Documents/OpenClawData/projects/star-steps/prototype/high-fi/css/components.css)
  - [mascot.css](/Users/claw/Documents/OpenClawData/projects/star-steps/prototype/high-fi/css/mascot.css)
  - [pages.css](/Users/claw/Documents/OpenClawData/projects/star-steps/prototype/high-fi/css/pages.css)
  - [theme.js](/Users/claw/Documents/OpenClawData/projects/star-steps/prototype/high-fi/js/theme.js)
  - [mascot.svg](/Users/claw/Documents/OpenClawData/projects/star-steps/prototype/high-fi/svg/mascot.svg)

关键证据：

- [9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl](/Users/claw/.openclaw/agents/laojun/sessions/9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl#L59)
- [9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl](/Users/claw/.openclaw/agents/laojun/sessions/9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl#L60)

这一步已经偏离“协调员不直接写项目产物”的目标。

### 阶段 E：回合中止与回执错乱

长回合最终以 `aborted` 结束：

- [9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl](/Users/claw/.openclaw/agents/laojun/sessions/9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl#L62)

随后还残留一个半截 `write`：

- [9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl](/Users/claw/.openclaw/agents/laojun/sessions/9caca37b-7f22-471d-afa3-6c40f6d0d511.jsonl#L63)

结果：

- 飞书前台先长时间无感知
- 后面一次性刷出多条状态
- 状态中混杂“派发中 / 已完成 / 专家无写权限 / 我自己接手”
- 用户看到的是堆叠后的混乱结论，而不是实时 checkpoint

## 根因

### 1. 角色边界是软约束，不是硬保险丝

现状 -> 老君 prompt 里写了“应路由给专家”。  
问题 -> 异常时它仍可自行 `write`，于是协调员退化成执行者。  
方案 -> 从配置层直接禁止老君写项目工件，禁止它自行起通用执行链路。

### 2. 前台口径和底层执行标识没有对齐

现状 -> 群里说“已派给 `uiux-designer`”。  
问题 -> 底层可能是 `claude`、subagent、老君主会话，名称和真实执行体不一致。  
方案 -> 对共享专家使用唯一执行入口；回执时必须报告真实执行链路。

### 3. 长任务采用“回合完成后再回”的批处理模式

现状 -> 当前链路天然更接近 completion-based 回执。  
问题 -> 若 agent 不显式在阶段边界发消息，就会长时间沉默，最后集中刷屏。  
方案 -> 把 checkpoint 汇报上升为硬规则：每批开始、完成、失败都要主动回执。

### 4. 长回合里继续写文件，风险会快速放大

现状 -> 同一回合里既做协调，又做生成，又做写盘。  
问题 -> 一旦超时、中断、工具调用截断，状态和工件会同时失真。  
方案 -> 一个回合只做一个批次；一个批次只做少量文件；写完立即验收与回报。

### 5. “大文件一把梭”思维会放大所有问题

现状 -> 旧路径倾向单次生成大量 HTML/CSS/JS。  
问题 -> 容易超长、超时、半截 tool call、后续维护困难。  
方案 -> 模块化、分文件、分层写入，作为所有共享专家的统一约束。

### 6. 项目维护 Agent 的查找口径错了

现状 -> 老君一度用 `agents_list`、`~/Documents/OpenClawData/agents/` 目录、以及“当前无活跃会话”来判断 `star-steps` 项目维护 Agent 是否存在。  
问题 -> 这和当前架构不一致。项目维护 Agent 的路径公约是：

- `~/Documents/OpenClawData/projects/<projectId>/agent/`
- `~/Documents/OpenClawData/projects/<projectId>/.runtime/openclaw/workspace/`

同时，OpenClaw 的 session store 仍可能落在全局：

- `~/Documents/OpenClawData/agents/<projectId>/sessions/sessions.json`

这导致“项目资产在 projects 下，session 在 agents 下”的双落点现象。如果用单一路径启发式判断，很容易误判成“未初始化”。

方案：

1. 老君先按项目路径公约查项目资产
2. 再核对 `project-registry.json` 与 `openclaw.json`
3. 最后用 `sessions_send(agent:<projectId>:main)` 验证可达性
4. 禁止再用 `agents_list` 或 `~/Documents/OpenClawData/agents/<projectId>/` 直接否定项目维护 Agent

### 7. “已注册”不等于“gateway 能转发”

现状 -> `star-steps` 已在 `project-registry.json` 和 `openclaw.json` 注册，但老君第一次 handoff 仍失败。  
问题 -> 根因不是项目没初始化，而是 gateway 缺全局 `anthropic-proxy` auth/model 配置；项目 Agent 本地可直跑，但经 `sessions_send` 走 gateway 时会报鉴权错误。  
方案 -> 全局 `openclaw.json` 也必须具备共享 provider/auth；项目 Agent 的本地 `models.json` / `auth-profiles.json` 只是必要条件，不是充分条件。

### 8. `sessions_send` 与自动播报链路会产生重复回流

现状 -> 老君转发给项目维护 Agent 后，除了项目维护 Agent 的结构化结论，还出现了：

- 自动播报再回流给老君
- `NO_REPLY`
- `REPLY_SKIP`
- `ANNOUNCE_SKIP`

问题 -> 这些并非业务错误，而是当前 agent-to-agent announce / provenance 机制的副产物，会让 transcript 看起来“多说了几句”。  
方案 -> 短期内把它视为可接受噪音；长期应在框架层收口：

1. 区分“给上游 agent 的回包”与“自动播报消息”
2. 减少 `NO_REPLY` / `ANNOUNCE_SKIP` 暴露到主 transcript
3. 让项目维护 Agent 的回包默认只给上游，不重复回流到对人时间线

## 这次确认的框架层限制

### 1. 共享专家链路可用，但不等于自动稳定

`Claude -> 专家`、`ACP -> Claude` 是能跑的。  
问题不在“完全不可用”，而在：

- 协调员会不会绕开它
- 专家完成后能否稳定写盘
- 回执是否及时回到群里

### 2. 长线任务当前不是“流式项目经理模式”

当前更像：

- 接到任务
- 跑一个长回合
- 若无中断，则在后面统一吐出状态

而不是：

- 做一点
- 回一点
- 异常立刻反馈

所以如果不额外规定 checkpoint，前台体验就会很差。

### 3. 会话中止会导致“状态认知”和“落地文件”脱钩

可能出现三种分裂：

1. 文件已写，前台还说没完成
2. 前台说完成，但实际没写盘
3. 文件写了一部分，但最终汇报缺失

这正是本次用户困惑的直接来源。

### 4. 项目 Agent 的资产路径与会话路径并不统一

当前实际情况：

- 项目资产：`~/Documents/OpenClawData/projects/<projectId>/...`
- session store：`~/Documents/OpenClawData/agents/<projectId>/sessions/...`

这不是业务层错误，而是 OpenClaw 当前架构行为。  
因此，“能否找到项目 Agent”必须按多处事实联合判断，而不能假设所有东西都在同一路径树下。

## 经验

1. **共享专家要有唯一入口。**
   - 不能让协调员临时判断“这次我自己上”。
2. **协调员不能拥有项目产物写权限。**
   - 否则异常路径一定会退化成“自己救火”。
3. **长任务必须 checkpoint 化。**
   - 不允许“全部做完再一起汇报”。
4. **禁止单文件巨型交付。**
   - 模块化不是风格偏好，而是稳定性要求。
5. **前台话术必须报告真实执行体。**
   - 不能说“已派给 uiux-designer”，底层却是别的链路。
6. **异常优先回报，不优先自救。**
   - 共享专家写盘异常时，协调员应升级风险，而不是自己接手写文件。

## 已采取措施

本轮已经或正在推进以下收口：

1. 老君禁用通用 `sessions_spawn`
2. 老君改为共享专家 direct `acpx` 路由
3. 共享专家 prompt 加入“模块化、分文件、禁止巨大单文件”
4. 老君与项目协调员模板加入“不得直接写项目工件”的规则
5. 长任务要求按批次汇报开始 / 完成 / 失败
6. 项目维护 Agent 模板补齐 Claude `anthropic-proxy` models/auth
7. 全局 `openclaw.json` 补齐 `anthropic-proxy` provider/auth，保证 gateway 可转发项目 Agent
8. 老君改成按项目路径公约 + 注册表 + `openclaw.json` + `sessions_send` 联合判断项目维护 Agent
9. `star-steps` 项目维护 Agent 已完成命令行直连验证与老君 handoff 验证

相关文档：

- [老君 UI 交付链路](/Users/claw/.openclaw/docs/operator/laojun-ui-delivery.md)
- [Expert Routing And Modular Delivery Implementation Plan](/Users/claw/.openclaw/docs/superpowers/plans/2026-03-15-expert-routing-and-modular-delivery.md)

## 后续规则

### 协调员规则

1. 只做收敛、派发、验收、汇报
2. 不直接写项目工件
3. 共享专家异常时，先回报，再等待用户决策

### 专家规则

1. 先给文件结构和批次计划
2. 一次只交付一个批次
3. 一个批次只含少量文件
4. 写完即校验，校验即回执

### 回执规则

每批至少三类消息：

1. 已开始：本批目标、文件范围、预计时长
2. 已完成：已落地文件、查看路径、剩余批次
3. 已失败：失败点、风险、需要谁决策

### 项目维护 Agent 判定规则

1. 先按项目路径公约查 `projects/<projectId>/agent/` 与 runtime workspace
2. 再核对 `project-registry.json` 与 `openclaw.json`
3. 再用 `sessions_send(agent:<projectId>:main)` 验证可达
4. 若 handoff 失败，先归类为“启动/鉴权/网关异常”，不要直接说“未初始化”

## 最小回归检查

下次测老君设计任务时，至少检查：

1. 群里是否先正确读出项目绑定
2. 是否明确说出真实执行体是 `uiux-designer`
3. 是否只给出批次计划，不直接越权写文件
4. 是否每批即时回执，而不是最终集中刷屏
5. 若失败，是否先回报异常，而不是自己接手做完
6. 项目维护 Agent 是否按路径公约与注册表被正确识别
7. 老君是否通过 `sessions_send` 成功把项目内问题转给 `agent:<projectId>:main`

## 一句话沉淀

共享专家体系要稳定，关键不只是“能不能调用专家”，而是：**协调员不越权、执行体可追踪、交付可分批、异常先回报。**
