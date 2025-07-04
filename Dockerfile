FROM node:20.19.2

# 创建应用目录
WORKDIR /usr/src/app

# 复制package.json和package-lock.json
COPY package.json ./
COPY pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install

# 复制应用代码
COPY . .

# 创建data目录，确保有正确的权限
RUN mkdir -p data && chmod 777 data

# 暴露端口
EXPOSE 8002

# 运行应用
CMD [ "node", "server.js" ] 