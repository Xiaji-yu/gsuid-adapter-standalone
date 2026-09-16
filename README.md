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
git clone https://github.com/Xiaji-yu/gsuid-adapter-standalone.git
cd gsuid-adapter-standalone

# 安装依赖（项目使用 pnpm）
pnpm install
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
| **blacklist** | 黑名单 QQ 号列表 | `[]` |
| **groupConfigs** | 按群配置（key 为群号）：`enabled` 缺省视为启用，显式设 `false` 才关闭；`forwardPrefix` 为该群转发前缀（留空转发全部消息） | `{}` |
| **disableMultiBot** | 禁用多 bot，固定使用 `napcat` 作为 bot_id | `false` |
| **privateFileForwardEnabled** | 是否开启私聊 file 消息转发 | `true` |
| **privateJsonBase64Enabled** | 是否开启私聊 JSON 文件转 base64 | `false` |
| **privateJsonBase64MaxKb** | 私聊 JSON 转 base64 大小限制（KB） | `1024` |
| **listenHost** | 反向 WS 监听地址 | `0.0.0.0` |
| **listenPort** | 反向 WS 监听端口 | `3002` |
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

项目根目录已内置 `Dockerfile` 和 `docker-compose.yml`，无需手动创建。

### 方式一：Docker Compose（推荐）

```bash
# 1. 准备配置文件（容器内 /app/config.json 通过 volume 挂载）
cp config.example.json config.json
# 编辑 config.json，填入 gscoreUrl、httpUrl、token 等（本地部署保持默认 127.0.0.1 即可）

# 2. 构建并启动（首次会自动构建镜像）
docker compose up -d --build

# 3. 查看日志
docker logs -f gsuid-adapter
```

`docker-compose.yml` 要点：
- **`network_mode: host`**：适配器容器共享宿主机网络，`127.0.0.1` 即宿主机本身——GScore、SnowLuma 等跑在宿主机时，`config.json` 保持默认的 `127.0.0.1` 地址即可连通
- 反向 WS 直接监听宿主机 `3002` 端口（host 模式下不需要也不支持 `ports` 端口映射）
- 挂载 `./config.json` → `/app/config.json`、`./logs` → `/app/logs`

> **注意**：如果 `docker compose build` 报 `permission denied: ~/.docker/buildx/...`，
> 说明 buildx 缓存目录属主不对，执行 `sudo chown -R $USER:$USER ~/.docker` 修复，
> 或改用传统构建器：`DOCKER_BUILDKIT=0 docker compose up -d --build`。

### 方式二：Dockerfile（手动构建）

```bash
# 构建镜像
docker build -t gsuid-adapter .

# 运行容器（推荐 --network host，本地部署零配置直连宿主机服务）
docker run -d \
  --name gsuid-adapter \
  --restart always \
  --network host \
  -v $(pwd)/config.json:/app/config.json \
  -v $(pwd)/logs:/app/logs \
  gsuid-adapter
```

Dockerfile 流程：`node:20-alpine` 安装 pnpm → `pnpm install --no-frozen-lockfile`（仓库未提交 lock 文件）→ `pnpm build` → `pnpm prune --prod` 仅保留运行时依赖（ws）。

### ⚠️ 网络模式说明（重要）

**为什么默认使用 host 模式？** GsCore（早柚核心）的 WS 端点仅信任回环地址（`TRUSTED_IPS` 默认为 `127.0.0.1` / `::1` / `localhost`）：从非回环来源 IP（例如 Docker 网桥网关 `172.x.0.1`）发起的连接会在握手前被 `close(1008)` 拒绝，客户端表现为 **HTTP 403 连接错误**。桥接网络下容器访问宿主机上的 GScore 必然 403，因此本地部署统一采用 host 模式，让适配器以 `127.0.0.1` 身份直连。

| 部署场景 | 推荐做法 |
| :--- | :--- |
| GScore / 载体都跑在宿主机（最常见） | 使用默认的 `network_mode: host`，`config.json` 保持 `127.0.0.1` |
| GScore 运行在 Docker 容器中 | 适配器与该容器接入同一网络后用容器名寻址；同时在 GScore 配置 `WS_TOKEN`，并在适配器 `gscoreToken` 填入相同值（非回环连接必须通过 token 校验） |
| GScore 在另一台机器 | `gscoreUrl` 指向对方地址，并在其 `WS_TOKEN` 与适配器 `gscoreToken` 配置相同 token |

> **注意**：GsCore 对同一来源 IP 连续 5 次 token 校验失败会封禁 15 分钟，排查连接问题时不要短时间内反复暴力重连。

#### 桥接网络模式（可选）

如需网络隔离，可将 compose 中 `network_mode: host` 改回桥接模式（删除 `network_mode: host`，恢复 `ports: - "3002:3002"` 与 `networks:` 段落）。此时：

- 访问宿主机服务：使用 `host.docker.internal`（Linux 需在 compose 中自行添加 `extra_hosts: - "host.docker.internal:host-gateway"`，或 `docker run --add-host=host.docker.internal:host-gateway`）
- 访问同网络的其他容器：直接用容器名寻址，如 `ws://gscore-core:8765`、`http://snowluma:1315`

```bash
# 将已在运行的容器接入适配器网络（容器需先启动）
docker network connect gscore-network snowluma
```

> 若想把适配器加入**已有的**外部网络，将 compose 中 `gscore-network:` 改为 `external: true`。

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
├── gsuid-adapter-2026-09-15.log
├── gsuid-adapter-2026-09-16.log
└── gsuid-adapter-2026-09-17.log
```

- **滚动策略**：按日期滚动，每天一个文件
- **保留天数**：自动清理 2 天前的日志
- **控制台输出**：同时输出到 stdout/stderr

## 🐧 使用 systemctl 后台运行

前置步骤：将项目部署到目标目录（如 `/opt/gsuid-adapter-standalone`）后，先完成安装、构建与配置：

```bash
cd /opt/gsuid-adapter-standalone
pnpm install && pnpm build
cp config.example.json config.json   # 编辑填入实际配置
```

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
