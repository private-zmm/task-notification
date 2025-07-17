FROM node:20.19.2

# 设置 Node.js 内存限制
ENV NODE_OPTIONS="--max-old-space-size=512"

# 设置时区为北京时间 (Asia/Shanghai)
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 全局安装pnpm
RUN npm install -g pnpm

# 创建npm到pnpm的映射，使npm命令使用pnpm执行
RUN corepack enable && \
    corepack prepare pnpm@latest --activate

# 创建应用目录
WORKDIR /usr/src/app

# 复制package.json
COPY package*.json ./

# 如果存在pnpm-lock.yaml则复制
COPY pnpm-lock.yaml* ./

# 设置pnpm配置
RUN pnpm config set auto-install-peers true
RUN pnpm config set strict-peer-dependencies false

# 使用pnpm安装依赖
RUN pnpm install --frozen-lockfile || pnpm install

# 复制应用代码
COPY . .

# 创建data目录，确保有正确的权限
RUN mkdir -p data && chmod 777 data

# 暴露端口
EXPOSE 8002

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8002/ || exit 1

# 运行应用
CMD [ "node", "server.js" ] 
