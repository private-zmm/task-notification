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
  await ensureDataDir();
  
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // 如果文件不存在或解析错误，返回默认配置
    return DEFAULT_CONFIG;
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