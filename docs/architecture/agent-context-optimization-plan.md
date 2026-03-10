# Agent 启动上下文压缩方案

## 目标

在不破坏当前多 Agent 运行能力的前提下，降低启动上下文成本，提高人格稳定性，减少旧记忆与无关技能干扰。

## 当前判断

当前 4 个 Agent 的启动成本，主要不是人格文件，而是：

1. 共享 `skills snapshot` 过重
2. 个别 Agent 的 `MEMORY.md` 含历史噪音
3. 部分 Agent 缺少 `BOOTSTRAP.md`
4. 部分 Agent 缺少明确的执行边界

## 当前静态估算

按 workspace 入口文件粗估：

- `wukong`：约 `1535` tokens
- `taibai`：约 `1675` tokens
- `guanyin`：约 `639` tokens
- `guichengxiang`：约 `2060` tokens

共同额外成本：

- `skills snapshot` 约 `5560` tokens

所以真实启动上下文大致在：

- `wukong`：约 `7100`
- `taibai`：约 `7240`
- `guanyin`：约 `6200`
- `guichengxiang`：约 `7620`

## 核心问题

### 1. skill 装载过宽

当前所有 Agent 基本共享同一批技能目录。  
这会导致：

- token 浪费
- 角色边界变虚
- 通用助手倾向增强

### 2. 主 Agent 记忆陈旧

`wukong/MEMORY.md` 仍有旧 EvoMap 内容。  
这与当前“总管家 / 项目经理”定位不一致。

### 3. 辅助 Agent 约束不均衡

- `taibai`：约束最完整
- `guichengxiang`：约束较完整
- `wukong`：缺 `BOOTSTRAP.md`
- `guanyin`：缺 `BOOTSTRAP.md`，工具与边界也过薄

### 4. 协作停留在人设层

当前“转交专家 / 转交 Codex”更多是提示词要求。  
还不是稳定的生产级协作链路。

## 方案

### Phase 1. 先压启动上下文

1. 为每个 Agent 定义最小技能集
2. 不再默认给全部 Agent 暴露完整共享技能目录
3. 将不常用技能改为按需加载，而不是常驻入口

优先级：

- `guanyin`
- `wukong`
- `guichengxiang`
- `taibai`

### Phase 2. 清洗人格入口

1. `wukong` 增加 `BOOTSTRAP.md`
2. `guanyin` 增加 `BOOTSTRAP.md`
3. `guanyin/TOOLS.md` 增加明确工具边界
4. 清理 `wukong/MEMORY.md` 旧 EvoMap 噪音

### Phase 3. 明确 runtime-driving 文档

把会驱动 Agent 行为的文档，和给人看的说明文档分离：

- runtime-driving
- operator-docs
- incidents
- agent-specific

避免 Agent 把纯说明文档误当运行输入。

### Phase 4. 补真实协作协议

先只做 3 条最小链路：

1. `wukong -> taibai`
2. `wukong -> guanyin`
3. `wukong / guichengxiang -> Codex`

每条链路要明确：

- 触发条件
- 交接字段
- 回收格式
- 失败回退方式

## 建议的最小技能集

### wukong

- 基础沟通/读写/执行
- 风险判断
- Codex 转交能力

不应默认带：

- 外贸专属技能
- seed 专属线程规则

### taibai

- `trade-operations-workflow`
- 飞书文档/多维表格
- 文件与脚本执行

### guanyin

- 基础沟通
- 文档读写
- 少量检索

不应默认带：

- 大量工程/自动化/外贸技能

### guichengxiang

- 文档读取
- 工件回写
- Codex 转交

不应默认带：

- 外贸技能
- 教育技能
- 大量无关业务技能

## 预期收益

1. 首轮人格更稳
2. 通用助手口径更少
3. token 成本下降
4. 误触发无关技能的概率下降
5. Agent 角色差异更明显

## 下一步建议

1. 先做 `wukong` 和 `guanyin` 的 `BOOTSTRAP.md`
2. 再清 `wukong/MEMORY.md`
3. 再做技能白名单收缩
4. 最后补正式协作协议
