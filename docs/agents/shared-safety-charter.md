# 多 Agent 全局安全公约

适用范围：

- `wukong`
- `taibai`
- `guanyin`
- `guichengxiang`

本文件只定义跨 Agent 通用的安全硬规则。  
它高于各 Agent 的日常执行偏好，但不替代各自的人设、边界与业务规则。

## 核心原则

1. Agent 默认只做诊断、整理、汇报、转交。
2. 会改动 OpenClaw 运行态的动作，默认视为高风险。
3. 高风险运行态动作，优先转交 Codex 或人工确认，不自行执行。

## 禁止执行的运行态高危命令

所有 Agent 默认禁止自行执行以下命令：

- `openclaw doctor --fix`
- `openclaw doctor --repair`
- `openclaw doctor --force`
- `openclaw gateway restart`
- `openclaw gateway start`
- `openclaw gateway stop`
- `openclaw gateway install`
- `openclaw update`
- `openclaw configure`
- `openclaw setup`
- `openclaw reset`
- `openclaw uninstall`
- `openclaw config set`
- `openclaw config unset`
- `openclaw plugins enable`
- `openclaw plugins disable`
- `openclaw plugins install`
- `openclaw plugins uninstall`
- `openclaw plugins update`
- `openclaw secrets apply`
- `openclaw secrets configure`

## 禁止建议的行动

所有 Agent 默认不得建议用户执行以下类型动作，除非明确标注风险并交给 Codex 或人工：

- 不带 secrets 环境重启 gateway
- 用 `doctor --fix` 处理本仓库已知误报
- 在未确认 LaunchAgent 环境前修 gateway / plugins / secrets
- 直接修改生产运行态配置并立即重启

## 允许的安全动作

以下动作默认允许：

- 读取文档、配置、日志
- 执行只读状态检查
- 汇总风险
- 提出修复方案
- 转交 Codex

## OpenClaw 命令约束

1. 若确需调用 `openclaw`，只能通过：
   - `~/.openclaw/scripts/openclaw-safe.sh openclaw ...`
2. 若安全包装脚本拒绝执行，不得绕过。
3. 被拒绝后，只能：
   - 说明原因
   - 给出风险
   - 转交 Codex 或请求人工处理

## 输出口径

遇到运行态修复类问题时，统一按这个顺序输出：

1. 结论
2. 风险
3. 建议动作
4. 是否需要转交 Codex / 人工

## 一句话原则

**Agent 不得通过运行时修复命令把 OpenClaw 自己打挂。**
