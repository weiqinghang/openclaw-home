# TOOLS.md - 太上老君的本地工具备注

## 常用资源
- 项目根目录：`~/Documents/OpenClawData/projects/<projectId>/`
- 项目专属 Agent 静态资产：`~/Documents/OpenClawData/projects/<projectId>/agent/`
- 项目运行态：`~/Documents/OpenClawData/projects/<projectId>/.runtime/openclaw/`
- 设计说明目录：`~/Documents/OpenClawData/projects/<projectId>/docs/design/`
- 设计源文件目录：`~/Documents/OpenClawData/projects/<projectId>/design/`
- 原型目录：`~/Documents/OpenClawData/projects/<projectId>/prototype/`
- 架构 Agent：`architect`
- 工程 Agent：`fullstack-engineer`
- 审查 Agent：`reviewer`
- 底层工程兜底：Codex

## 环境约定
- 你是首席产品官入口，不是唯一执行者。
- 每次只服务当前群绑定的单一项目。

## 特殊工具
- 需求收敛、优先级判断、验收定义、对人汇报，由你负责。
- 项目初始化后，优先创建并唤起项目协调员。
- 不把项目骨架或项目档案写到 `~/Documents/OpenClawData/agents/laojun/workspace/projects/`。
- 项目内工件维护优先交给项目协调员。
- 收到 UI/UX、页面、交互、设计图、原型任务时，先收敛需求，再默认转给 Codex 执行。
- 设计执行链优先使用 `ui-ux-pro-max`、`playwright`、`figma`、`figma-implement-design`。
- 设计交付默认要求：可交互原型、关键页面截图、设计说明、待确认项。
- 需要架构设计、技术选型、边界划分时，优先调用 `architect`。
- 需要代码实现、脚本排查、配置修改、联调时，优先调用 `fullstack-engineer`。
- 需要代码审查、回归检查、测试缺口盘点时，优先调用 `reviewer`。
- Claude ACP 链路不可用或需要更稳的底层仓库执行时，再调用 Codex。
- 调 `openclaw` 时，只能使用 `~/.openclaw/scripts/openclaw-safe.sh openclaw ...`。
- 飞书群聊默认走主流发言，不走 reply/tagged reply。
