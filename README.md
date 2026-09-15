# 🦊 GScore Adapter Standalone

独立运行的 GScore 适配器，通过反向 WebSocket 接收来自 NapCat、SnowLuma 或其他 OneBot 载体的事件，转发给 GScore（早柚核心）处理。

## ✨ 主要功能

- **🚀 独立运行**：无需 NapCat 插件层，作为独立 Node.js 服务运行
- **🔌 多载体支持**：支持 NapCat、SnowLuma 及标准 OneBot v11 载体
- **🛡️ 权限管理**：支持设置主人 QQ，仅限指定主人操作
- **📝 群组管理**：独立控制每个群组是否启用 GScore 响应
- **🚫 黑名单系统**：支持拉黑指定用户，忽略其消息触发
- **🔄 断线重连**：自动检测 GScore 连接状态并在断开后尝试重连
- **📊 状态监控**：内置状态查看指令，随时掌握连接情况
- **📡 元事件上报**：支持向 GScore 上报进群、退群、戳一戳三类标准 meta 事件
- **↩️ 撤回回执**：支持 `wait_recall` 场景，发送后回传消息 ID
- **🛠️ 控制消息**：支持 GScore 下发主动撤回与群禁言/解禁控制

## 🛠️ 安装

```bash
# 克隆项目
git clone <repository-url>
cd gsuid-adapter-standalone

# 安装依赖
pnpm install
# 或
npm install
```

## 🚀 运行

```bash
# 构建
pnpm build

# 启动（默认读取 config.json，监听 3002 端口）
pnpm start

# 自定义配置文件和端口
node dist/standalone.mjs --config ./my-config.json --port 3002
```

## 📝 配置

复制配置文件并修改：

```bash
cp config.example.json config.json
```

### 配置项说明

| 配置项 | 说明 | 默认值 |
| :--- | :--- | :--- |
| **gscoreEnable** | 全局开关：是否启用 GScore 消息转发 | `true` |
| **gscoreUrl** | GScore WebSocket 地址 | `ws://localhost:8765` |
| **gscoreToken** | GScore 连接鉴权 Token | 空 |
| **reconnectInterval** | 断线重连间隔（毫秒） | `5000` |
| **maxReconnectAttempts** | 最大重连次数，0 为无限重连 | `10` |
| **commandPrefix** | 群内管理指令前缀 | `#早柚` |
| **masterQQ** | 主人 QQ（多个用英文逗号分隔） | 空 |
| **masterForwardWhenDisabled** | 群禁用时仍转发主人消息 | `false` |
| **forwardSelfMessage** | 上报/转发机器人自身消息 | `false` |
| **silentNoPermission** | 无权限时静默（不回复权限提示） | `false` |
| **customImageSummary** | 图片消息 summary 外显（多个用逗号隔开） | 空 |
| **customForwardInfo** | 自定义合并转发信息 | `false` |
| **customForwardQQ** | 自定义合并转发 QQ 号 | 空 |
| **customForwardName** | 自定义合并转发昵称 | 空 |
| **blacklist** | 黑名单 QQ 号列表 | `[]` |
| **groupConfigs** | 按群配置（key 为群号） | `{}` |
| **disableMultiBot** | 禁用多 bot，固定使用 `napcat` 作为 bot_id | `false` |
| **privateFileForwardEnabled** | 是否开启私聊 file 消息转发 | `true` |
| **privateJsonBase64Enabled** | 是否开启私聊 JSON 文件转 base64 | `false` |
| **privateJsonBase64MaxKb** | 私聊 JSON 转 base64 大小限制（KB） | `1024` |
| **listenHost** | 反向 WS 监听地址 | `0.0.0.0` |
| **listenPort** | 反向 WS 监听端口 | `3002` |
| **adapterTypes** | 启用的协议适配器类型 | `["napcat", "snowluma", "generic-ob11"]` |
| **wsToken** | 反向 WS 鉴权 Token（连接时需携带 `?token=xxx`） | 空 |
| **httpUrl** | OneBot HTTP API 地址（如 `http://172.24.0.2:3000`），配置后优先走 HTTP | 空 |
| **httpToken** | HTTP API 鉴权 Token（Bearer Token）。**留空时自动使用 `wsToken`** | 空 |

> 带注释的配置示例见 `config.example.commented.json`。

## 🔌 载体配置

### NapCat

在 NapCat 配置中启用反向 WebSocket：

```json
{
  "reverse_ws": {
    "enabled": true,
    "url": "ws://<适配器IP>:3002/",
    "reconnect_interval": 5000
  }
}
```

如果配置了 `wsToken`，需在 URL 中携带 token：

```json
{
  "reverse_ws": {
    "enabled": true,
    "url": "ws://<适配器IP>:3002/?token=your-token",
    "reconnect_interval": 5000
  }
}
```

### SnowLuma

在 SnowLuma 配置中设置反向 WebSocket 连接：

```yaml
connection:
  mode: server
  url: ws://<适配器IP>:3002/
```

如果配置了 `wsToken`，需在 URL 中携带 token：

```yaml
connection:
  mode: server
  url: ws://<适配器IP>:3002/?token=your-token
```

### HTTP API（推荐）

如果 SnowLuma/NapCat 暴露了 HTTP API，建议配置 `httpUrl` 和 `httpToken`，Action 调用会优先走 HTTP，无需依赖 WS 下发：

```json
{
  "httpUrl": "http://172.24.0.2:3000",
  "httpToken": "your-token"
}
```

## 📜 指令列表

默认命令前缀为 `#早柚`（可在配置中修改）。

| 指令 | 描述 | 权限要求 |
| :--- | :--- | :--- |
| `#早柚help` | 查看帮助信息 | 主人 |
| `#早柚status` | 查看连接状态、运行时长、黑名单人数 | 主人 |
| `#早柚version` | 查看插件版本 | 主人 |
| `#早柚重连` | 立即重连 GScore 服务 | 主人 |
| `#早柚群开启` / `#早柚群启用` | 开启本群 GScore 适配 | 主人 |
| `#早柚群关闭` / `#早柚群禁用` | 关闭本群 GScore 适配 | 主人 |
| `#早柚开启上报` / `#早柚关闭上报` | 开启/关闭上报 Bot 自身消息 | 主人 |
| `#早柚拉黑 @用户` | 拉黑用户（不转发其消息） | 主人 |
| `#早柚取消拉黑 @用户` | 取消拉黑用户 | 主人 |

## 🐳 Docker 部署

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

EXPOSE 3002
CMD ["node", "dist/standalone.mjs"]
```

## 📄 License

MIT License
