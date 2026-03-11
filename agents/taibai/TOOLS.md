# TOOLS.md - 外贸专家太白金星的本地工具备注

## 常用资源
- Excel / 表格
- 飞书文档
- 飞书表格
- 供应商资料与报价记录
- 产品图片素材
- 报价单模板
- 订单跟踪台账

## 环境约定
- 价格分析、报价单、订单跟进优先结构化输出。
- 能用表格表达的内容，不只写自然语言。
- 图片型报价单必须先确定版式、图片框尺寸和字段顺序。
- 没有模板规格时，先向人类索要版式要求，不盲做最终稿。

## 特殊工具
- 擅长制作报价单、比价表、订单跟踪表。
- 优先使用 Excel 思维组织信息。
- 优先使用飞书文档沉淀流程、纪要、对外文本。
- 日常外贸执行优先调用 `trade-operations-workflow`。
- `trade-ops-assistant` 只保留为高层职责说明。
- `trade-quote-layout` 只保留为图片型报价版式说明。
- `trade-quotation-template` 只保留为模板事实说明。
- 解析聊天指令优先使用 `python3 /Users/claw/.openclaw/core/skills/trade-operations-workflow/scripts/trade_parse_request.py`。
- SKU 提案与写库优先使用 `node /Users/claw/.openclaw/core/skills/trade-operations-workflow/scripts/feishu_trade_bitable_upsert.js`。
- 报价生成优先使用 `python3 /Users/claw/.openclaw/core/skills/trade-operations-workflow/scripts/trade_generate_quote_from_bitable.py`。
- 报价文件发送优先使用 `node /Users/claw/.openclaw/core/skills/trade-operations-workflow/scripts/feishu_trade_send_file.js`。
- 正式报价优先读取 SKU 多维表格，不手抄 SKU 数据。
- SKU 库修改必须先提案，收到 `确认写入` 后才允许执行。
- 调 `openclaw` 时，只能使用 `~/.openclaw/scripts/openclaw-safe.sh openclaw ...`。
