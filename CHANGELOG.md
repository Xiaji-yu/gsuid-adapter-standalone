# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- 修复 `standalone.ts` 中 `ActionDispatcher` 重复导入导致的构建失败
- 修复多处类型导入路径错误（`bot-registry.ts`、`state.ts`、各 adapter 的 `../types` 目录导入）
- 修复 `PluginConfig` 缺少 `wsToken` 字段声明
- 修复 `WsServer` 的 `carrier:registered` 事件缺少 carrier 参数
- 移除损坏的 `napcat-types` 依赖（其发布源码含语法错误且缺上游依赖），改为在 `src/types/ob11.ts` 本地定义 OneBot v11 类型
- 统一 WebSocket 类型为 `ws` 包类型，消除与 DOM 全局类型的冲突
- 修复 Docker 部署下适配器无法连接宿主机 GScore 的问题（容器内 `127.0.0.1` 指向自身导致 ECONNREFUSED；且 GsCore 仅信任回环 IP，桥接网络源 IP 会被 403 拒绝）

### Added
- 新增 `Dockerfile`（此前仓库缺失，`docker compose up -d` 直接报 `no such file or directory`）

### Changed
- `docker-compose.yml`：改用 `network_mode: host`，适配器以回环地址直连宿主机上的 GScore / 载体 HTTP API，本地部署零网络配置
- `docker-compose.yml`：移除废弃的 `version` 字段；网络默认由 compose 自动创建（不再强制 `external: true`）
- `pnpm-workspace.yaml`：设置 `allowBuilds.esbuild: true`，修复 pnpm 12 严格模式下 `pnpm install` 报 `ERR_PNPM_IGNORED_BUILDS` 失败的问题
- README Docker 章节：重写为 host 模式为主，补充 GsCore `TRUSTED_IPS` / `WS_TOKEN` 安全机制与桥接网络模式说明

### Removed
- 移除无效的 `adapterTypes` 配置项（运行时无条件注册全部协议适配器，该字段从未被读取）
- 移除合并转发彩蛋配置（`customForwardInfo` / `customForwardQQ` / `customForwardName`）及相关硬编码兜底值，合并转发节点统一以机器人自身身份发送

## [1.3.5] - 2026-09-15

### Added
- 独立运行模式，不再依赖 NapCat 插件层
- 反向 WebSocket Server，支持 NapCat / SnowLuma / 标准 OneBot v11 载体
- 协议适配器层：NapCatAdapter / SnowLumaAdapter / GenericOB11Adapter
- ActionDispatcher：优先通过 HTTP 调用 OneBot API，失败时 fallback 到 WS
- BotRegistry：管理多 bot carrier 连接
- 配置持久化：支持 `config.json` 文件配置
- 黑名单、群组管理、权限管理等核心功能
- GScore 消息格式转换（OneBot ↔ GScore）
- 元事件上报（进群、退群、戳一戳）
- 撤回回执与 GScore 控制消息处理
- 支持通过反向 WS 接收 OneBot 事件
- 支持通过 HTTP API 下发 OneBot API 调用
- 支持 wsToken / httpToken 鉴权

### Changed
- 从 NapCat 插件架构迁移为独立 Node.js 服务架构
- 消息发送从 `ctx.actions.call()` 改为 HTTP/WS 双通道
