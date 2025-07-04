const cron = require('node-cron');
const { sendNotification } = require('./emailService');
const config = require('./config');

/**
 * 执行定时任务并发送通知
 */
function executeTask() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  const timeStr = now.toLocaleTimeString('zh-CN');
  
  const subject = `${config.taskName} - ${dateStr}`;
  
  // 这里可以添加实际的任务逻辑
  const taskResult = {
    success: true,
    executionTime: `${dateStr} ${timeStr}`,
    details: '任务执行成功'
  };
  
  // 生成邮件内容
  const content = `
    <h2>${config.taskName}执行报告</h2>
    <p><strong>执行时间:</strong> ${taskResult.executionTime}</p>
    <p><strong>执行结果:</strong> ${taskResult.success ? '成功' : '失败'}</p>
    <p><strong>详细信息:</strong> ${taskResult.details}</p>
  `;
  
  // 发送邮件通知
  return sendNotification(subject, content);
}

// 测试函数 - 立即发送一封测试邮件
async function sendTestEmail() {
  console.log('发送测试邮件...');
  const result = await executeTask();
  console.log('测试邮件结果:', result);
}

// 设置定时任务
function setupCronJob() {
  if (!cron.validate(config.cronSchedule)) {
    console.error('无效的CRON表达式:', config.cronSchedule);
    return false;
  }
  
  console.log(`已设置定时任务, 计划: ${config.cronSchedule}`);
  
  cron.schedule(config.cronSchedule, () => {
    console.log(`执行定时任务: ${new Date().toLocaleString('zh-CN')}`);
    executeTask()
      .then(result => {
        if (result.success) {
          console.log('任务通知发送成功');
        } else {
          console.error('任务通知发送失败');
        }
      })
      .catch(err => console.error('任务执行出错:', err));
  });
  
  return true;
}

// 添加命令行参数支持
const args = process.argv.slice(2);
if (args.includes('--test')) {
  // 发送测试邮件
  sendTestEmail();
} else {
  // 启动定时任务
  setupCronJob();
  console.log(`任务通知服务已启动，将在指定时间 [${config.cronSchedule}] 发送通知`);
}

// 防止程序退出
process.on('SIGINT', () => {
  console.log('服务已停止');
  process.exit(0);
}); 