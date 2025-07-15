const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bodyParser = require('body-parser');
const path = require('path');
const cron = require('node-cron');
const { sendNotification } = require('./emailService');
const { loadConfig, saveConfig } = require('./dataStore');

const app = express();
const PORT = process.env.PORT || 8002;

// 配置视图引擎和静态文件
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// 配置中间件
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  store: new FileStore({
    path: './sessions',
    ttl: 86400, // 1天过期时间
    retries: 0
  }),
  secret: 'task-notification-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000 // 1天
  }
}));

// 活跃的任务计划
const activeTasks = new Map();

// 设置时区为北京时间
process.env.TZ = 'Asia/Shanghai';
console.log(`当前系统时区设置为北京时间，当前时间：${new Date().toLocaleString()}`);

// 启动任务
async function startTask(task) {
  if (activeTasks.has(task.id)) {
    stopTask(task.id);
  }

  if (!task.enabled || !cron.validate(task.schedule)) {
    return false;
  }

  const job = cron.schedule(task.schedule, async () => {
    console.log(`执行任务 [${task.name}]: ${new Date().toLocaleString('zh-CN')}`);
    
    try {
      const result = await sendNotification(
        task.subject,
        task.content,
        task.recipients
      );
      
      console.log(`任务 [${task.name}] 通知发送结果:`, result.success ? '成功' : '失败');
    } catch (error) {
      console.error(`任务 [${task.name}] 执行失败:`, error);
    }
  });
  
  activeTasks.set(task.id, job);
  console.log(`任务 [${task.name}] 已启动, 计划: ${task.schedule}`);
  return true;
}

// 停止任务
function stopTask(taskId) {
  const job = activeTasks.get(taskId);
  if (job) {
    job.stop();
    activeTasks.delete(taskId);
    console.log(`任务 ID:${taskId} 已停止`);
    return true;
  }
  return false;
}

// 加载并启动所有启用的任务
async function initTasks() {
  const config = await loadConfig();
  
  // 设置邮件服务配置
  process.env.EMAIL_HOST = config.email.host;
  process.env.EMAIL_PORT = config.email.port;
  process.env.EMAIL_USER = config.email.user;
  process.env.EMAIL_PASS = config.email.pass;
  
  // 启动所有已启用的任务
  for (const task of config.tasks) {
    if (task.enabled) {
      await startTask(task);
    }
  }
}

// 路由 - 首页
app.get('/', async (req, res) => {
  const config = await loadConfig();
  res.render('index', { config });
});

// API - 获取所有配置
app.get('/api/config', async (req, res) => {
  const config = await loadConfig();
  // 不返回密码
  const safeConfig = { ...config };
  if (safeConfig.email) {
    safeConfig.email = { ...safeConfig.email, pass: '' };
  }
  res.json(safeConfig);
});

// API - 更新邮件配置
app.post('/api/email', async (req, res) => {
  try {
    const config = await loadConfig();
    config.email = {
      ...config.email,
      ...req.body
    };
    await saveConfig(config);
    res.json({ success: true });
  } catch (error) {
    console.error('更新邮件配置失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API - 获取所有任务
app.get('/api/tasks', async (req, res) => {
  const config = await loadConfig();
  res.json(config.tasks || []);
});

// API - 创建新任务
app.post('/api/tasks', async (req, res) => {
  try {
    const config = await loadConfig();
    const newTask = {
      id: Date.now().toString(),
      ...req.body,
      enabled: req.body.enabled === 'true' || req.body.enabled === true
    };
    
    if (!config.tasks) {
      config.tasks = [];
    }
    
    config.tasks.push(newTask);
    await saveConfig(config);
    
    // 如果任务已启用，则立即启动
    if (newTask.enabled) {
      await startTask(newTask);
    }
    
    res.json({ success: true, task: newTask });
  } catch (error) {
    console.error('创建任务失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API - 更新任务
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const config = await loadConfig();
    
    const taskIndex = config.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }
    
    const updatedTask = {
      ...config.tasks[taskIndex],
      ...req.body,
      id,
      enabled: req.body.enabled === 'true' || req.body.enabled === true
    };
    
    config.tasks[taskIndex] = updatedTask;
    await saveConfig(config);
    
    // 停止旧任务
    stopTask(id);
    
    // 如果任务已启用，则重启
    if (updatedTask.enabled) {
      await startTask(updatedTask);
    }
    
    res.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('更新任务失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API - 删除任务
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const config = await loadConfig();
    
    const taskIndex = config.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }
    
    // 停止任务
    stopTask(id);
    
    // 移除任务
    config.tasks.splice(taskIndex, 1);
    await saveConfig(config);
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除任务失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API - 测试邮件
app.post('/api/test-email', async (req, res) => {
  try {
    const { recipients, subject, content } = req.body;
    
    const result = await sendNotification(
      subject || '测试邮件',
      content || '这是一封测试邮件，如果您收到此邮件，说明您的邮件配置正确。',
      recipients ? (Array.isArray(recipients) ? recipients : [recipients]) : []
    );
    
    res.json({ 
      success: result.success, 
      message: result.success ? '测试邮件发送成功' : '测试邮件发送失败',
      error: result.error
    });
  } catch (error) {
    console.error('发送测试邮件失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API - 导出配置
app.get('/api/config/export', async (req, res) => {
  try {
    const config = await loadConfig();
    
    // 设置响应头，指示浏览器下载文件
    res.setHeader('Content-Disposition', 'attachment; filename=task-notification-config.json');
    res.setHeader('Content-Type', 'application/json');
    
    // 直接发送JSON字符串，而不是使用res.json()
    res.send(JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('导出配置失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API - 导入配置
app.post('/api/config/import', async (req, res) => {
  try {
    const importedConfig = req.body;
    
    // 基本验证，确保导入的配置包含必要的字段
    if (!importedConfig || !importedConfig.email || !Array.isArray(importedConfig.tasks)) {
      return res.status(400).json({ success: false, error: '无效的配置文件格式' });
    }
    
    // 保存导入的配置
    await saveConfig(importedConfig);
    
    // 停止所有当前任务
    for (const [taskId, job] of activeTasks.entries()) {
      job.stop();
      activeTasks.delete(taskId);
    }
    
    // 重新加载配置并启动任务
    await initTasks();
    
    res.json({ success: true });
  } catch (error) {
    console.error('导入配置失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`服务器已启动: http://localhost:${PORT}`);
  await initTasks();
});

// 处理进程退出
process.on('SIGINT', () => {
  console.log('服务器已停止');
  process.exit(0);
}); 