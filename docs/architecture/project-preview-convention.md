# 项目预览规范

## 1. 项目目录结构标准

所有项目统一放在 `~/Documents/OpenClawData/projects/<projectId>/`，目录骨架如下：

```
<projectId>/
├── agent/                    # 项目维护 Agent 静态资产
├── docs/
│   ├── design/               # 设计说明文档（brief、决策记录）
│   ├── spec/                 # 产品规格
│   └── ...
├── design/                   # 设计源文件（Figma 导出、PSD 等）
├── prototype/
│   ├── low-fi/               # 低保真原型
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   ├── high-fi/              # 高保真原型
│   │   ├── index.html
│   │   ├── css/
│   │   ├── js/
│   │   ├── pages/
│   │   └── svg/
│   └── README.md             # 原型说明（可选）
├── .runtime/openclaw/        # Agent 运行态（不纳入版本控制）
└── ...
```

### 关键约束

- `prototype/low-fi/` 和 `prototype/high-fi/` **必须平级**，不允许一个嵌套在另一个下面。
- 每个保真度目录下必须有 `index.html` 作为入口。
- 隐藏目录（`.` 开头）不对外暴露。
- 设计说明放 `docs/design/`，设计源文件放 `design/`，不要混放。

## 2. 内网预览服务

### 服务信息

| 项目 | 值 |
|------|-----|
| 端口 | `18900` |
| LaunchAgent | `ai.openclaw.preview` |
| plist | `~/Library/LaunchAgents/ai.openclaw.preview.plist` |
| 脚本 | `~/.openclaw/scripts/preview-server.js` |
| 日志 | `~/.openclaw/logs/preview.log` / `preview.err.log` |
| 根目录 | `~/Documents/OpenClawData/projects/` |

### 访问方式

#### 本机
```
http://localhost:18900/
```

#### 远程（Tailscale）
```
http://100.90.1.33:18900/
```

### URL 路由

| URL | 说明 |
|-----|------|
| `/` | 门户页，列出所有项目及快捷链接 |
| `/<projectId>/` | 项目根目录浏览 |
| `/<projectId>/prototype/low-fi/` | 低保真原型（自动走 index.html） |
| `/<projectId>/prototype/high-fi/` | 高保真原型（自动走 index.html） |
| `/<projectId>/docs/design/` | 设计说明文件列表 |

### 功能特性

- 目录下有 `index.html` 时自动加载，没有时显示文件列表。
- 禁止 `.` 开头的隐藏文件和目录访问（防止泄露 `.runtime/` 等）。
- 防路径穿越。
- 无需认证（依赖 Tailscale 网络层隔离）。

## 3. 运维命令

```bash
# 启动
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.preview.plist

# 停止
launchctl bootout gui/$(id -u)/ai.openclaw.preview

# 重启
launchctl bootout gui/$(id -u)/ai.openclaw.preview && \
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.preview.plist

# 查看状态
launchctl print gui/$(id -u)/ai.openclaw.preview

# 查看日志
tail -f ~/.openclaw/logs/preview.log
tail -f ~/.openclaw/logs/preview.err.log
```

## 4. 后续扩展方向

- 接入其他可预览内容（API 文档、Storybook 等）时，追加端口或子路由。
- 若需要认证，考虑在 Tailscale ACL 层或加一层 basic auth。
- 若项目增多，门户页可按状态/类型分组。
