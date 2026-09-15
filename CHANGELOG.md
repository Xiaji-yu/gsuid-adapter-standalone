# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

### Changed
- 从 NapCat 插件架构迁移为独立 Node.js 服务架构
- 消息发送从 `ctx.actions.call()` 改为 HTTP/WS 双通道

## [1.3.5] - 2024-09-15

### Added
- 初始独立版本发布
- 支持通过反向 WS 接收 OneBot 事件
- 支持通过 HTTP API 下发 OneBot API 调用
- 支持 wsToken / httpToken 鉴权
