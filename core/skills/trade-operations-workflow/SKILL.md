---
name: trade-operations-workflow
description: 太白的一体化外贸执行 skill。硬规则：SKU 修改必须先提案，未收到“确认写入”严禁直接调用多维表格写工具；报价必须先补齐客户名、SKU、数量，再生成 Excel。
tags: [trade, quotation, sku, bitable, excel, feishu]
---

# Trade Operations Workflow

硬规则：
1. `sku.upsert` 必须先运行 `trade_parse_request.py` 和 `feishu_trade_bitable_upsert.js propose`
2. 未收到 `确认写入`，严禁直接调用 `feishu_bitable_update_record` / `feishu_bitable_create_record`
3. `quote.generate` 缺客户名、SKU、数量时，只追问，不生成半成品

用于太白金星的两类正式执行任务：

1. `quote.generate`
2. `sku.upsert`

## 默认规则

- 报价：**结构化指令触发**
- 缺字段：**只追问缺口**
- SKU 维护：**先提案，后写入**
- 未收到 `确认写入`：**不得改库**
- 收到 `取消`：**放弃本次写入**
- 严禁直接调用多维表格写工具跳过提案

## 正式数据源

- SKU 多维表格：`L3t3bcP0LaDQcSsz3cDcpEjknTf`
- 模板：`/Users/claw/Downloads/quotation/260105 To Eurl Mahelelaine-1.5% RMB Account Quotation of Cleaning Wringer Cart from Wing +86 15802157286  .xlsx`
- 图片：太白工作区本地图

## 触发判断

### 1. 生成报价单

用户说法包含：

- `生成报价单`
- `做报价单`
- `出报价`

且消息里应能抽出：

- 客户名
- 1 个或多个 `SKU-...`
- 每个 SKU 对应数量

先运行：

```bash
python3 /Users/claw/.openclaw/scripts/trade_parse_request.py --message "<用户原话>"
```

若返回 `missingFields` 非空：
- 只追问缺失字段
- 不生成文件

若返回 `ready=true`：
- 使用 `customerName`
- 将 `items` 转成 `--skus` 和 `--quantities`
- 运行：

```bash
python3 /Users/claw/.openclaw/scripts/trade_generate_quote_from_bitable.py \
  --template "/Users/claw/Downloads/quotation/260105 To Eurl Mahelelaine-1.5% RMB Account Quotation of Cleaning Wringer Cart from Wing +86 15802157286  .xlsx" \
  --customer "<customerName>" \
  --skus "SKU-AAA-01,SKU-BBB-01" \
  --quantities "80,60"
```

完成后回复：

- 先把 Excel 报价单作为飞书文件发送给当前用户
- 再给使用的 SKU、总金额、总体积、风险项

### 2. 维护 SKU 库

用户说法包含：

- `把 SKU... 改成`
- `修改 SKU`
- `新增 SKU`
- `更新 SKU`

先运行：

```bash
python3 /Users/claw/.openclaw/scripts/trade_parse_request.py --message "<用户原话>"
```

若返回 `missingFields` 非空：
- 只追问缺失字段

若命中派生字段，如：

- `cbm`
- `packages`
- `totalGw`
- `总价`
- `总体积`

必须拒绝，说明：
- 这是报价态计算结果
- 不是 SKU 主数据

若可提案：

```bash
node /Users/claw/.openclaw/scripts/feishu_trade_bitable_upsert.js propose '<解析后的 JSON>'
```

向用户返回提案摘要：

- 目标 SKU
- 变更字段
- 原值
- 新值

只有用户明确回复 `确认写入` 时，才执行：

```bash
node /Users/claw/.openclaw/scripts/feishu_trade_bitable_upsert.js apply
```

如果用户回复 `取消`：
- 终止本次变更
- 不做任何写库动作

## 固定 schema

只允许维护以下 SKU 字段：

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

## 报价计算规则

报价态字段不入库，实时算：

- `packages = quantity / pcsPerPackage`
- `lineTotalUsd = quantity * unitPriceUsd`
- `lineTotalRmb = lineTotalUsd * 1.015`
- `lineCbm = cartonLengthCm * cartonWidthCm * cartonHeightCm * packages / 1000000`

## 输出要求

### 报价完成

- 先发飞书文件
- 再给报价摘要
- 再给风险项

### SKU 维护完成

- 先给写入结果
- 再给变更字段
- 再给是否影响报价

## 注意

- 不要手写估算值替代多维表格数据
- 不要跳过提案直接改 SKU
- 不要直接调用 `feishu_bitable_update_record` 或 `feishu_bitable_create_record` 跳过提案
- 不要把报价态结果写回 SKU 库
- 不要保留多余空 SKU 行

## TODO

1. 设计多维表格拆分策略
- 目标：适配数十个供应商、几万个 SKU、单表容量受限的场景
- 输出：分表规则、索引表、路由规则、跨表查询/写入策略

2. 实现历史资料批量入库脚本
- 来源：历史报价单、产品册、本地图册
- 输出：批量抽取 SKU 主数据、写入对应飞书多维表格、同步本地图片素材目录
