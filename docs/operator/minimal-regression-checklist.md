# 升级后最小回归清单

目标：每次 `openclaw update` 或运行态兼容层调整后，用最少步骤确认核心能力仍在。

## 1. LaunchAgent secrets 已同步

若你改过 `secrets.local.json`，先执行：

```bash
node scripts/sync-launchagent-secrets.js --restart-gateway --check-health
```

确认点：

1. gateway 能正常重启
2. `OPENCLAW_GATEWAY_TOKEN` 已同步
3. `FEISHU_*_APP_SECRET` 已同步

## 2. Gateway 健康检查

```bash
./scripts/with-openclaw-secrets.sh openclaw gateway health
```

通过标准：

1. `Gateway Health`
2. `OK`
3. `Feishu: ok`

## 3. ACP 全链路验收

```bash
./scripts/check-acp-runtime.sh
```

通过标准：

1. 项目级 ACP 通过
2. 内部 ACP 返回 `INTERNAL_PONG`
3. 最终 `pass=5 fail=0`

## 4. 老君入口人工冒烟

检查点：

1. `laojun` 仍能在项目群正常接话
2. 已绑定群不需要重新手工补 `@`
3. 老君仍能把任务转交给项目协调员和专家执行者

## 5. 太白核心链路人工冒烟

检查点：

1. 太白仍能接收报价相关请求
2. 报价生成链路不报 appSecret / gateway 类错误
3. 飞书文档/多维表格相关脚本仍能正常访问

## 6. 若失败，优先检查

1. LaunchAgent 环境变量是否漂移
2. `scripts/resolve-acpx-bin.sh` 是否还能找到 `acpx`
3. `scripts/openclaw-acp-spawnedby-patch.js status` 是否为 `upstream_fixed` 或 `patched`
4. `openclaw.json` 是否又引入了顶层 `channels.feishu.*` 冗余字段
