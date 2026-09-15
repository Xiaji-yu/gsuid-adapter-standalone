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

### 方式一：Docker Compose（推荐）

在项目根目录创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  gsuid-adapter:
    build: .
    container_name: gsuid-adapter
    restart: always
    ports:
      - "3002:3002"  # 反向 WS 监听端口
    volumes:
      - ./config.json:/app/config.json  # 配置文件
      - ./logs:/app/logs                # 日志目录
    environment:
      - NODE_ENV=production
    networks:
      - gscore-network

networks:
  gscore-network:
    external: true  # 如果已有网络，设为 external；否则删除这行让 compose 自动创建
```

### 方式二：Dockerfile

如果需要单独构建镜像：

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm 和依赖
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 构建
RUN pnpm build

# 暴露端口（反向 WS）
EXPOSE 3002

# 启动命令
CMD ["node", "dist/standalone.mjs"]
```

### 构建和运行

```bash
# 构建镜像
docker build -t gsuid-adapter .

# 运行容器
docker run -d \
  --name gsuid-adapter \
  --restart always \
  -p 3002:3002 \
  -v $(pwd)/config.json:/app/config.json \
  -v $(pwd)/logs:/app/logs \
  --network gscore-network \
  gsuid-adapter
```

### 配置文件

**重要**：容器内需要配置文件才能运行。启动前请先复制并编辑：

```bash
cp config.example.json config.json
# 编辑 config.json，填入 gscoreUrl、httpUrl、token 等
```

### 网络说明

如果你的 SnowLuma/GScore 也在 Docker 中，建议让它们加入同一个网络：

```bash
# 创建网络（只需一次）
docker network create gscore-network

# 将 SnowLuma 加入网络
docker network connect gscore-network snowluma

# 将适配器加入网络
docker network connect gscore-network gsuid-adapter
```

配置文件中可以使用容器名作为地址：

```json
{
  "gscoreUrl": "ws://gscore-core:8765",
  "httpUrl": "http://snowluma:3000"
}
```

### 查看日志

```bash
# 查看容器日志
docker logs -f gsuid-adapter

# 进入容器查看日志文件
docker exec -it gsuid-adapter sh
cat logs/gsuid-adapter-$(date +%Y-%m-%d).log
```

## 📋 日志

日志文件默认输出到项目根目录的 `logs/` 文件夹：

```
logs/
├── gsuid-adapter-2024-09-15.log
├── gsuid-adapter-2024-09-16.log
└── gsuid-adapter-2024-09-17.log
```

- **滚动策略**：按日期滚动，每天一个文件
- **保留天数**：自动清理 2 天前的日志
- **控制台输出**：同时输出到 stdout/stderr

## 🐧 使用 systemctl 后台运行

### 1. 创建服务文件

```bash
sudo nano /etc/systemd/system/gsuid-adapter.service
```

### 2. 填入以下内容

```ini
[Unit]
Description=GScore Adapter Standalone
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/gsuid-adapter-standalone
ExecStart=/usr/bin/node dist/standalone.mjs
Restart=always
RestartSec=5

# 日志配置
StandardOutput=append:/opt/gsuid-adapter-standalone/logs/gsuid-adapter.log
StandardError=append:/opt/gsuid-adapter-standalone/logs/gsuid-adapter-error.log

# 环境变量（可选）
# Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 3. 修改权限并启用服务

```bash
# 赋予执行权限
chmod +x /opt/gsuid-adapter-standalone/dist/standalone.mjs

# 重新加载 systemd
sudo systemctl daemon-reload

# 启用开机自启
sudo systemctl enable gsuid-adapter

# 启动服务
sudo systemctl start gsuid-adapter
```

### 4. 常用命令

```bash
# 查看状态
sudo systemctl status gsuid-adapter

# 查看日志
sudo journalctl -u gsuid-adapter -f

# 重启服务
sudo systemctl restart gsuid-adapter

# 停止服务
sudo systemctl stop gsuid-adapter

# 禁用开机自启
sudo systemctl disable gsuid-adapter
```

### 5. 日志轮转（可选）

如果需要更灵活的日志轮转，可以使用 `logrotate`：

```bash
sudo nano /etc/logrotate.d/gsuid-adapter
```

```conf
/opt/gsuid-adapter-standalone/logs/*.log {
    daily
    rotate 2
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        systemctl reload gsuid-adapter > /dev/null 2>&1 || true
    endscript
}
```

## 📄 License

MIT License
