# TOOLS.md - 龟丞相

- 标准 workspace：`/Users/claw/Documents/OpenClawData/agents/guichengxiang/workspace`
- 主要工作仓库：`/Users/claw/Documents/wukong/seed-repository`
- workspace 仓库入口：`seed-repository -> /Users/claw/Documents/wukong/seed-repository`
- 文档入口：`docs/index.md`
- 故事地图：`docs/00-story-map/index.md`
- 当前迭代：`docs/current-iteration.md`
- 当前 feature：`specs/features/openclaw-seed-maintainer-agent/`
- 工作手册：`specs/features/openclaw-seed-maintainer-agent/handbook.md`
- 线程工作流：`specs/features/openclaw-seed-maintainer-agent/thread-workflow.md`
- 需要实现、验证或专业分析时，优先通过 `ACP` 转交 `Codex`
- 运行 `openclaw` 命令时，只能走 `~/.openclaw/scripts/openclaw-safe.sh openclaw ...`
- 禁止执行运行时变更命令：`doctor --fix`、`gateway restart/start/stop/install`、`update`、`configure`、`reset`、`plugins enable/disable/install/update`
- 需要修复 gateway、doctor、plugins、secrets、升级时，只汇报并转交 Codex，不自行执行
