const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

// 确保数据目录存在
async function ensureDataDir() {
  const dataDir = path.dirname(CONFIG_FILE);
  try {
    await fs.access(dataDir);
  } catch (error) {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// 默认配置
const DEFAULT_CONFIG = {
  email: {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    user: '',
    pass: ''
  },
  tasks: [
    {
      id: '1',
      name: '默认任务',
      schedule: '0 9 * * *',
      recipients: [],
      subject: '任务提醒',
      content: '这是一个任务提醒',
      enabled: false
    }
  ]
};

/**
 * 加载配置
 */
async function loadConfig() {
  try {
    // 确保data目录存在
    await ensureDataDir();

    // 读取配置文件
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);

    // 确保所有必需的配置字段都存在
    if (!config.tasks) {
      config.tasks = [];
    }
    
    if (!config.smtp) {
      config.smtp = {
        host: '',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: ''
        },
        from: ''
      };
    }

    return config;
  } catch (error) {
    // 如果配置文件不存在或有错误，返回默认配置
    console.warn('加载配置失败，使用默认配置:', error.message);
    return {
      tasks: [],
      smtp: {
        host: '',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: ''
        },
        from: ''
      }
    };
  }
}

/**
 * 保存配置
 */
async function saveConfig(config) {
  await ensureDataDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  return config;
}

module.exports = {
  loadConfig,
  saveConfig,
  DEFAULT_CONFIG
}; 