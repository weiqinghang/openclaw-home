# Runtime Dependencies

这个 skill 的运行依赖分两类：

## 仓库配置

- `openclaw.json`
- `secrets.local.json`

用途：

- 读取 `taibai` 的飞书 `appId`
- 读取本地 `appSecret`
- 读取 `taibai` 的 workspace 路径

## 运行态资源

- SKU 多维表格 App：`L3t3bcP0LaDQcSsz3cDcpEjknTf`
- SKU 表：`tblI6bexYECqDOnj`
- 默认输出目录：`{taibai.workspace}/quotations/`
- SKU 提案暂存：`{taibai.workspace}/state/pending-sku-upsert.json`

## 约束

- 这些依赖属于 skill 的运行输入，不放回仓库级 `scripts/`
- 代码入口应从本 skill 的 `scripts/` 调用
- 若未来模板文件需要入库，优先放入本 skill 的 `assets/`
