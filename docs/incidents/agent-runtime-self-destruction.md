# Agent 自毁型运行时操作事故复盘

日期：2026-03-11

## 现象

`guichengxiang` 在会话中自行执行 `openclaw doctor --fix` 后，gateway 异常关闭。  
后续 `gateway health` 返回 `1006 abnormal closure`。

## 直接原因

`doctor --fix` 触发了运行态修复/服务重写。  
重写后的 LaunchAgent 环境里缺少：

- `OPENCLAW_GATEWAY_TOKEN`
- `FEISHU_WUKONG_APP_SECRET`
- `FEISHU_TAIBAI_APP_SECRET`
- `FEISHU_GUANYIN_APP_SECRET`
- `FEISHU_GUICHENGXIANG_APP_SECRET`

而当前配置仍依赖这些 SecretRef。  
结果：gateway 启动时无法解析 secrets，进程异常退出。

## 根因

### 1. Agent 拥有“能修运行态”的执行路径

现状 -> Agent 能直接尝试 `openclaw` 高危命令。  
问题 -> 它不知道哪些命令会改 LaunchAgent、gateway、plugins、secrets。  
方案 -> 默认禁止高危运行态变更命令，改为诊断后转交 Codex。

### 2. 只靠提示词，不足以防止自毁

现状 -> 即使人格边界正确，Agent 仍可能在排障时尝试危险命令。  
问题 -> “不要这样做”只是软约束，执行链路仍然存在。  
方案 -> 必须增加技术保险丝。

### 3. `doctor` 存在已知误报场景

现状 -> 本仓库多账号飞书结构下，`doctor` 会反复提示 `channels.feishu.accounts.default` 迁移建议。  
问题 -> Agent 容易把误报当成真实修复建议。  
方案 -> 明确把该类修复列为高危项，不让 Agent 自行应用。

## 本次落地措施

### 1. 全局安全公约

新增：

- [`docs/agents/shared-safety-charter.md`](../agents/shared-safety-charter.md)

定义所有 Agent 通用的运行态安全底线。

### 2. 安全包装脚本

新增：

- [`scripts/openclaw-safe.sh`](../../scripts/openclaw-safe.sh)

作用：

- 所有 Agent 调 `openclaw` 时统一走带 secrets 的包装
- 高危命令直接拒绝执行

### 3. 各 Agent 显式接入

已把公约接入：

- `wukong`
- `taibai`
- `guanyin`
- `guichengxiang`

## 经验

1. 多 Agent 架构里，安全规则必须有“全局层”，不能只散落在各自人格文件。
2. 运行态修复命令不能直接暴露给 Agent 自主尝试。
3. 对 `doctor`、`gateway`、`plugins`、`secrets`、`update` 这类命令，默认策略应是：
   - Agent 诊断
   - Codex 执行
   - 人工兜底
4. 真正稳定的防护，必须是“规则 + 技术保险丝”。

## 后续建议

1. 若未来还有其他 Agent 需要跑 `openclaw`，统一只允许走 `scripts/openclaw-safe.sh`。
2. 若要进一步根治，可继续在权限层增加“命令级 denylist”，而不是只拦消息文本。
3. 对已知 `doctor` 误报，单独维护 operator 文档，不让 Agent自行猜测是否该修。
