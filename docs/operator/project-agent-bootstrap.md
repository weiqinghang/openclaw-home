# 项目 Agent 初始化

目标：为项目创建专属维护 Agent，并把它注册到 OpenClaw。

## 目录约定

- 项目根目录：`~/Documents/OpenClawData/projects/<projectId>/`
- 项目 Agent 静态资产：`~/Documents/OpenClawData/projects/<projectId>/agent/`
- 项目文档与开发工件：`~/Documents/OpenClawData/projects/<projectId>/docs/`
- 设计说明：`~/Documents/OpenClawData/projects/<projectId>/docs/design/`
- 设计源文件：`~/Documents/OpenClawData/projects/<projectId>/design/`
- 可交互原型：`~/Documents/OpenClawData/projects/<projectId>/prototype/`
- 项目 Agent 运行态：`~/Documents/OpenClawData/projects/<projectId>/.runtime/openclaw/`
- 注册表：`ops/project-registry.json`

## 一键创建

```bash
node scripts/create-project-agent.js <projectId> --project-name "<项目名>" --group-id "<飞书群ID>" --owner-user-id "<飞书用户ID>"
```

示例：

```bash
node scripts/create-project-agent.js alpha --project-name "Alpha 项目" --group-id "oc_xxx" --owner-user-id "ou_xxx"
```

执行后会：

1. 创建 `~/Documents/OpenClawData/projects/<projectId>/agent/` 静态资产
2. 创建 `~/Documents/OpenClawData/projects/<projectId>/docs/` 基础工件
3. 创建 `~/Documents/OpenClawData/projects/<projectId>/docs/design/`、`design/`、`prototype/`
4. 创建 `~/Documents/OpenClawData/projects/<projectId>/.runtime/openclaw/` 运行态
5. 更新 `ops/project-registry.json`
6. 更新 `openclaw.json`
7. 若提供 `groupId`，自动写入：
   - `channels.feishu.accounts.<owner>.groupAllowFrom`
   - `channels.feishu.accounts.<owner>.groups.<groupId>.requireMention = false`
   - `channels.feishu.accounts.<owner>.groups.<groupId>.allowFrom = [ownerUserId]`（若提供）
8. 自动执行 `node scripts/sync-agent-workspace.js <projectId>`

## 仓库接入模式

默认是新项目：

```bash
node scripts/create-project-agent.js alpha --project-name "Alpha 项目"
```

旧项目若要同时接远程仓库，使用：

```bash
node scripts/create-project-agent.js alpha \
  --project-name "Alpha 项目" \
  --source-mode existing \
  --git-remote "git@git.tarsocial.com:team/alpha.git" \
  --spec trade \
 --topic bootstrap
```

已存在于本机的项目，使用原地 bootstrap：

```bash
node scripts/create-project-agent.js alpha \
  --project-name "Alpha 项目" \
  --source-mode existing-local
```

规则：

1. 默认项目根目录是 `~/Documents/OpenClawData/projects/<projectId>/`
2. 可用 `--project-root` 覆盖默认路径
3. `source-mode=new` 用于全新项目目录
4. `source-mode=existing` 用于需要 clone 远程仓库的旧项目
5. `source-mode=existing-local` 用于本机已存在、要补建项目维护 Agent 的项目
6. 内部 GitLab `git.tarsocial.com` 分支格式：`feature/<spec>-<topic>`
7. 内部 GitLab 禁止直推 `develop` / `devuat` / `product`
8. GitHub / 其他仓库默认分支格式：`codex/<spec>-<topic>`

## 使用规则

1. 首席产品官 `laojun`（昵称太上老君）负责对外接活、产品收敛与项目初始化 gate。
2. 每个项目维护 Agent 只服务自己的项目。
3. 软件工程类任务必须先在 `spec-kit-workflow` 与 `openspec-workflow` 中二选一。
4. 项目维护 Agent 默认不直接绑定飞书，由首席产品官代理对外。
5. 群已绑定项目，不代表项目已初始化完成；初始化完成必须包含项目维护 Agent 已创建并注册。

## 初始化完成判据

至少同时满足：

1. `projectId / projectName` 明确
2. 群绑定成立
3. `ops/project-registry.json` 有项目记录
4. `openclaw.json` 已注册项目维护 Agent
5. `~/Documents/OpenClawData/projects/<projectId>/agent/` 已生成
6. `~/Documents/OpenClawData/projects/<projectId>/.runtime/openclaw/workspace/` 已生成
7. `docs/`、`design/`、`prototype/` 基础骨架存在

只要任一项缺失，老君都应停在“初始化补齐模式”，而不是直接进入项目执行。

## 群初始化约定

新项目群 bootstrap 分两层：

1. 机器人级一次性初始化
   - 飞书应用
   - `appId/appSecret`
   - `openclaw.json` 账号绑定
2. 项目群级重复初始化
   - 新群 `groupId`
   - 新项目 `projectId`
   - 项目 owner 的飞书 `userId`
   - 群放行、群级免 `@`、群级 `allowFrom`
   - 首轮群消息联调

推荐命令：

```bash
node scripts/create-project-agent.js alpha --project-name "Alpha 项目" --group-id "oc_xxx" --owner-user-id "ou_xxx"
./scripts/with-openclaw-secrets.sh openclaw gateway health
```

仅预演变更：

```bash
node scripts/create-project-agent.js alpha --project-name "Alpha 项目" --group-id "oc_xxx" --owner-user-id "ou_xxx" --dry-run
```

## 自动化建议

最稳触发点不是“建群瞬间”，而是“新群第一次提出项目需求时”。

原因：

1. 此时更容易拿到项目名、目标、owner、范围
2. 可顺手完成群 `groupId -> projectId` 绑定
3. 避免为无效群或闲聊群滥建项目 Agent

## 关键经验

如果是 **Feishu 多账号模式**，群配置必须写到账号级：

```json
{
  "channels": {
    "feishu": {
      "accounts": {
        "laojun": {
          "groupPolicy": "allowlist",
          "groupAllowFrom": ["oc_xxx"],
          "groups": {
            "oc_xxx": {
              "requireMention": false,
              "allowFrom": ["ou_xxx"]
            }
          }
        }
      }
    }
  }
}
```

不要只写顶层 `channels.feishu.groupAllowFrom/groups`。  
在多账号模式下，运行时会优先读 `channels.feishu.accounts.<accountId>`。
