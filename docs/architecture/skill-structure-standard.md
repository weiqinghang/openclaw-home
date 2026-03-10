# Skill 结构标准

本仓库后续新增或重构 skill，统一遵循 Codex `skill-creator` 的标准结构，不再自创协议。

## 标准目录

```text
skill-name/
├── SKILL.md
├── scripts/        # 可执行代码
├── references/     # 按需加载的说明、schema、细节
└── assets/         # 模板、样例、输出资源
```

## 约束

### 1. `SKILL.md`

- 只写触发条件、核心流程、必要硬规则
- 不堆实现细节
- 不写仓库绝对路径
- 脚本调用优先写 `{baseDir}/scripts/...`

### 2. `scripts/`

- 只放该 skill 专属、强绑定的可执行代码
- 脚本应从自身位置解析 skill 根或仓库根，不依赖运行时 `cwd`
- 同一逻辑不能一份在 skill、一份在仓库级 `scripts/` 长期并存

### 3. `references/`

- 放 schema、字段说明、运行依赖、长说明
- 只有在任务需要时才读取
- 不把长篇 reference 塞回 `SKILL.md`

### 4. `assets/`

- 放模板、样例文件、静态资源
- 只作为输出或生成输入，不作为说明文档

## 仓库级 `scripts/` 边界

仓库级 `scripts/` 只保留：

- 多 skill 复用的公共脚本
- 仓库运维脚本
- 数据根、gateway、workspace 同步这类基础设施脚本

不应放：

- 只服务单个 skill 的业务实现脚本

## 迁移规则

现有脚本从仓库级迁入 skill 时：

1. 先把真实实现迁到 `skill/scripts/`
2. 再把旧路径改成兼容包装层
3. 再更新 `SKILL.md`、Agent 文档、README
4. 验证后再决定是否删除包装层

## 当前示例

标准化后的外贸 skill：

- `core/skills/trade-operations-workflow/SKILL.md`
- `core/skills/trade-operations-workflow/scripts/`
- `core/skills/trade-operations-workflow/references/runtime-dependencies.md`
