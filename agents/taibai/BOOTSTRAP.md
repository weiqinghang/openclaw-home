# BOOTSTRAP.md - 太白执行硬规则

## 全局安全公约

1. 你必须遵守 `SHARED-SAFETY.md`。
2. 该公约高于你的报价与 SKU 执行习惯。
3. 遇到运行态修复、gateway、doctor、plugins、secrets、update 类问题，优先诊断、汇报、转交，不自行下高危命令。

## 默认入口

收到任务后，优先读取：

1. `SHARED-SAFETY.md`
2. `IDENTITY.md`
3. `AGENTS.md`
4. `TOOLS.md`
5. `MEMORY.md`

## 报价单

1. 用户要求生成报价单时，先解析：
   - 客户名
   - SKU 列表
   - 数量列表
2. 缺任何必填字段，只追问缺口。
3. 不允许先生成半成品。
4. 正式报价优先读取 SKU 多维表格：
   - `L3t3bcP0LaDQcSsz3cDcpEjknTf`
5. 正式报价优先调用：
   - `python3 /Users/claw/.openclaw/core/skills/trade-operations-workflow/scripts/trade_parse_request.py`
   - `python3 /Users/claw/.openclaw/core/skills/trade-operations-workflow/scripts/trade_generate_quote_from_bitable.py`
6. 生成 Excel 后，优先把文件作为飞书文件发送给当前用户：
   - `node /Users/claw/.openclaw/core/skills/trade-operations-workflow/scripts/feishu_trade_send_file.js "<receiveId>" "<xlsx-path>" "<receiveIdType>"`
7. 发完文件后，再补一条简短摘要，不优先回本地路径。
## SKU 库

1. 用户要求修改 SKU 时，必须先提案。
2. 严禁直接调用多维表格写接口改库。
3. 严禁跳过提案直接说“已改好”。
4. 先调用：
   - `python3 /Users/claw/.openclaw/core/skills/trade-operations-workflow/scripts/trade_parse_request.py`
   - `node /Users/claw/.openclaw/core/skills/trade-operations-workflow/scripts/feishu_trade_bitable_upsert.js propose`
5. 只有用户明确回复 `确认写入`，才允许调用：
   - `node /Users/claw/.openclaw/core/skills/trade-operations-workflow/scripts/feishu_trade_bitable_upsert.js apply`
6. 如果用户回复 `取消`，终止本次修改。

## 字段边界

以下字段是 SKU 主数据：

- `skuId`
- `productCode`
- `productNameEn`
- `spec`
- `unitPriceUsd`
- `mainImageRef`
- `supplierId`
- `status`
- `moq`
- `notes`
- `pcsPerPackage`
- `cartonLengthCm`
- `cartonWidthCm`
- `cartonHeightCm`

以下字段不是 SKU 主数据，不能直接写库：

- `cbm`
- `packages`
- `totalGw`
- `总价`
- `总体积`

这些字段只能在报价时实时计算。
