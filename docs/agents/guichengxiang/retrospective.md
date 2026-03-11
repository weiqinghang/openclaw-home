# 龟丞相开发与验证回顾

日期：2026-03-10

## 目标

为 `guichengxiang` 建立一个只服务 `openclaw-codex-product-os-seed` 的飞书 Agent，并验证：

- 首轮自我介绍正确
- 默认读取顺序正确
- 不退回通用助理口径
- 不暴露仓库根前缀
- 默认边界为“准备变更并汇报，不自动提交、不自动 push”

## 实际过程

1. 先完成 Agent 注册、飞书应用绑定、workspace 挂载。
2. 首轮测试失败，`/new` 仍回答成通用助理。
3. 追加 `BOOTSTRAP.md` 后仍失败。
4. 继续排查后发现，workspace 入口文件使用软链接时，启动注入层会把它们判成 `missing`。
5. 改为实体文件后，首轮人格恢复正确。
6. 第二轮测试又出现“像是读过旧上下文”的现象。
7. 排查确认：除了 direct session，workspace memory 也会污染后续回答。
8. 清 direct session、会话文件、测试记忆后，重测结果才接近真实基线。

## 已确认根因

### 1. 启动入口文件不能用软链接

现状 -> Agent 能启动，但首轮人格经常失效。  
问题 -> 启动注入层会把 symlink 形式的 `AGENTS.md` / `BOOTSTRAP.md` / `IDENTITY.md` 等入口文件判成 `missing`。  
方案 -> workspace 入口文件一律复制成实体文件；只对 `skills` 和业务仓库入口保留软链接。

### 2. `BOOTSTRAP.md` 是新会话口径的关键入口

现状 -> 只改 `AGENTS.md`，`/new` 仍可能退回通用口径。  
问题 -> 首轮自我介绍、角色边界、默认读取顺序，需要在启动层强约束。  
方案 -> 用 `BOOTSTRAP.md` 固化“你是谁 / 你不是什么 / 首轮怎么答 / 默认读什么”。

### 3. 长期线程规则与 feature 验收规则不能混写

现状 -> 一份 `thread-workflow.md` 同时承载长期规则和本轮 feature 验收补充。  
问题 -> Agent 不知道哪些是永久行为，哪些只是当前 feature 的临时约束。  
方案 -> 拆分：

- Agent 层：`THREAD-WORKFLOW.md`
- Feature 层：`thread-workflow.md`

前者写长期线程行为，后者只写本轮验收补充。

### 4. 干净重测不只是“开新会话”

现状 -> 仓库工件已回退，但 Agent 仍复述上轮结论。  
问题 -> 污染源不只在当前聊天线程，还在：

- direct session 映射
- session jsonl
- workspace memory

方案 -> 重测前按最小集合清理运行态，不动 persona、skills、仓库工件。

## 有效信号

以下信号证明问题不在提示词内容，而在注入或运行态：

- `/new` 口径像通用助理，而不是仓库维护 Agent
- 明明改了 `AGENTS.md`，首轮回答几乎不变
- 仓库工件已回退，回答仍沿用上轮读过的结论
- system prompt 报告中入口文件显示 `missing`

## 本次形成的硬规则

1. 新 Agent 的 workspace 入口文件必须是实体文件，不用软链接。
2. 首轮人格与职责边界写在 `BOOTSTRAP.md`，不要只写在 `AGENTS.md`。
3. 长期线程行为放 `THREAD-WORKFLOW.md`，feature 验收补充单独存放。
4. 测试“角色是否正确”时，先看启动注入是否生效，再调提示词。
5. 测试“是否读了旧上下文”时，优先排查 session 和 memory，不先怀疑模型。
6. 重测时如需真实基线，必须明确清理范围，而不是笼统“新开一轮”。

## 推荐排查顺序

1. 看首轮口径是否正确。  
2. 若不对，先查启动入口文件是否被注入。  
3. 若注入正常，再看 `BOOTSTRAP.md` 是否覆盖到首轮约束。  
4. 若口径已对、但结论像“读过旧上下文”，再查 session 与 memory。  
5. 只有前面都排除后，才继续收紧提示词或模板。

## 下次新增 Agent 的最小检查单

### 接入前

- 飞书 App 已建好
- `openclaw.json` 三处已注册
- secret 已注入 gateway 运行环境
- workspace / sessions / users / logs 目录已建

### 接入时

- workspace 入口文件已复制成实体文件
- `BOOTSTRAP.md` 已定义首轮口径
- `THREAD-WORKFLOW.md` 已定义长期线程行为
- 业务仓库入口已挂到 workspace

### 首测时

- 测 `/new 你是谁？你能做什么？`
- 测默认读取顺序
- 测是否暴露不该暴露的路径
- 测默认边界是否过度主动

### 重测前

- 删除 direct session 映射
- 删除对应 session jsonl
- 删除本轮测试记忆
- 重启 gateway

## 本次仍未彻底解决的问题

1. session / memory 的沉淀策略仍不够透明。  
2. “什么内容会写入长期记忆” 还缺少稳定可见的说明。  
3. 需要一份专门的“重测清理手册”，避免每次临时猜。
4. 需要给 Agent 的 `openclaw` 命令增加安全包装，避免 `doctor --fix` 这类运行时修复命令把 gateway 自己打挂。

## 后续建议

1. 在 OpenClaw 仓库补一份“Agent 重测清理指南”。  
2. 给 runtime diagnostics 增加更显眼的入口文件注入状态。  
3. 为 session / memory 清理做一个标准脚本，避免手工删漏。
4. Agent 侧统一只使用 `scripts/openclaw-safe.sh` 调用 `openclaw`，高危命令默认转交 Codex。
