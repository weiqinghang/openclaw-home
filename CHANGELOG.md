# Changelog

## Unreleased

### Added

- 新增 3 个 Agent：`wukong`、`taibai`、`guanyin`
- 新增仓库级 `README.md`
- 新增仓库级 `CHANGELOG.md`
- 新增新增 Agent 指引 `docs/add-agent.md`
- 新增飞书用户接入指引 `docs/add-feishu-user.md`
- 新增外贸轻系统最小模型 `docs/trade-data-model.md`
- 新增本地 secrets 启动脚本 `scripts/with-openclaw-secrets.sh`
- 新增跨 Agent 公共用户画像层
- 新增共享画像字段白名单与受保护字段机制
- 新增共享画像提案接口与提案日志
- 新增数据根目录修改脚本 `scripts/set-data-root.js`
- 新增太白一体化工作流 skill `core/skills/trade-operations-workflow/`
- 新增太白工作流 Hook `hooks/taibai-workflow/`
- 新增 SKU 写库提案脚本 `scripts/feishu_trade_bitable_upsert.js`
- 新增聊天请求解析脚本 `scripts/trade_parse_request.py`

### Changed

- 重置多 Agent 架构，旧 `main` 不再作为运行入口
- 飞书改为 `1 App -> 1 accountId -> 1 agentId`
- 第 4 个 Agent `guichengxiang` 调整为标准外置运行目录
- `puti` Agent 全量更名为 `guanyin`
- 工作区、sessions、users、logs 迁出 `~/.openclaw`
- `openclaw.json` 改为入库管理，真实密钥不再明文入库
- `user-permissions` Hook 改为支持按 `{agentId}` 分流用户数据
- 用户记忆模型改为“公共层互通 + 私有层隔离”
- 新增运行时数据迁移脚本 `scripts/migrate-runtime-data.js`
- `~/Documents/OpenClawData` 改为通过 `scripts/set-data-root.js` 统一修改
- 太白改为优先走“报价解析 -> 报价生成”与“SKU 提案 -> 确认写入”双流程
- README 与操作指引补充 `with-openclaw-secrets.sh` 命令入口约定
- README 与操作指引补充 `doctor` / `gateway status` 常见误报说明

### Fixed

- 修复 Feishu `accounts` 配置结构错误导致的默认 Agent 串路由
- 修复 `guanyin` 外置工作区缺失核心文件链接导致的消息分发失败
- 修复新增 Agent 时最易遗漏的 LaunchAgent secret 同步约束文档
- 修复 `wukong`、`taibai`、`guanyin` 的 pairing 与多 App 接入链路
- 修复部分 owner/user 规则匹配问题
- 迁移旧 `~/.openclaw/users` 用户目录到外部 Agent 用户目录，并生成共享画像目录

### Security

- 飞书 `appSecret`、gateway token、技能密钥迁移到本地 secrets 管理
- `auth-profiles.json` 中密钥改为引用式配置
- 仓库忽略运行态目录与敏感认证材料
