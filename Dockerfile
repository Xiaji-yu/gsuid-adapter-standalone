# GScore Adapter Standalone 镜像
# 基于 Node.js 20，使用 pnpm 安装依赖并构建为单文件

FROM node:20-alpine

# 安装 pnpm（与本地开发环境保持一致）
RUN npm install -g pnpm

WORKDIR /app

# 先复制依赖清单安装依赖：利用 Docker 层缓存，仅源码变更时无需重装依赖
# 项目未提交 lock 文件，使用 --no-frozen-lockfile
COPY package.json pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile

# 复制源码并构建（dist/ 由 vite 生成）
COPY . .
RUN pnpm build

# 构建完成后移除开发依赖（vite/typescript 等），仅保留运行时依赖（ws）
RUN pnpm prune --prod

# 反向 WS 监听端口（NapCat / SnowLuma 等载体连接到此端口）
EXPOSE 3002

# 配置文件通过 volume 挂载到 /app/config.json
CMD ["node", "dist/standalone.mjs"]
