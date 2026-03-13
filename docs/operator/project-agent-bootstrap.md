# 项目 Agent 初始化

目标：为新项目创建专属维护 Agent，并把它注册到 OpenClaw。

## 目录约定

- 核心资产：`agents/projects/<projectId>/`
- 项目文档：`projects/<projectId>/docs/`
- 运行态：`~/Documents/OpenClawData/agents/<projectId>/`
- 注册表：`ops/project-registry.json`

## 一键创建

```bash
node scripts/create-project-agent.js <projectId> --project-name "<项目名>" --group-id "<飞书群ID>"
```

示例：

```bash
node scripts/create-project-agent.js alpha --project-name "Alpha 项目" --group-id "oc_xxx"
```

执行后会：

1. 创建 `agents/projects/<projectId>/` 提示词与 `agent/` 配置
2. 创建 `projects/<projectId>/docs/` 基础工件
3. 创建运行态目录
4. 更新 `ops/project-registry.json`
5. 更新 `openclaw.json`
6. 自动执行 `node scripts/sync-agent-workspace.js <projectId>`

## 使用规则

1. 共享 PM `mega-product-manager` 负责对外接活。
2. 每个项目维护 Agent 只服务自己的项目。
3. 软件工程类任务必须先在 `spec-kit-workflow` 与 `openspec-workflow` 中二选一。
4. 项目维护 Agent 默认不直接绑定飞书，由共享 PM 代理对外。

## 自动化建议

最稳触发点不是“建群瞬间”，而是“新群第一次提出项目需求时”。

原因：

1. 此时更容易拿到项目名、目标、owner、范围
2. 可顺手完成群 `groupId -> projectId` 绑定
3. 避免为无效群或闲聊群滥建项目 Agent
