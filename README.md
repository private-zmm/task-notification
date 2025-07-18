# 定时任务邮件通知系统

一个基于Node.js的定时任务邮件通知系统，可以通过Web界面配置定时任务和邮件发送设置。

## 功能特点

- 通过Web界面管理定时任务
- 支持多个不同的任务配置
- 自定义提醒时间（Cron表达式）
- 自定义邮件内容和收件人
- 邮件服务配置
- 测试邮件发送功能

## 安装

```bash
# 克隆仓库
git clone https://github.com/private-zmm/task-notification.git
cd task-notification

# 安装依赖
pnpm install
```

## 使用方法

```bash
# 启动服务
pnpm start

# 开发模式启动（需要安装nodemon）
pnpm dev
```

启动后，打开浏览器访问 `http://localhost:8002` 进入Web管理界面。

## 使用说明

1. 首先配置邮件服务器设置（SMTP服务器、端口、用户名和密码）
2. 创建定时任务，设置名称、执行时间、邮件内容和收件人
3. 启用任务后，系统将按照设定的时间发送邮件通知

## Cron表达式说明

Cron表达式格式: `分 时 日 月 星期`

例子:
- `0 9 * * *` - 每天上午9点
- `0 */2 * * *` - 每2小时
- `0 9 * * 1-5` - 工作日（周一至周五）上午9点
- `0 18 * * 0,6` - 周末（周六、周日）下午6点 

## 部署

docker build -t junweizhou/task-notification:1.0.2 .