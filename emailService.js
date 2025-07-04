const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

/**
 * 读取配置文件
 */
async function getConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取配置文件失败:', error);
    // 返回默认配置
    return {
      email: {
        host: 'smtp.163.com',
        port: 465,
        secure: true,
        user: '',
        pass: ''
      },
      recipients: []
    };
  }
}

/**
 * 创建邮件传输对象
 */
async function createTransporter() {
  const config = await getConfig();
  
  console.log('邮件配置信息:', {
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    user: config.email.user
  });

  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465, // 如果是465端口则使用SSL
    auth: {
      user: config.email.user,
      pass: config.email.pass
    }
  });
}

/**
 * 发送邮件通知
 * @param {string} subject - 邮件主题
 * @param {string} content - 邮件内容
 * @param {string[]} recipients - 收件人列表
 * @returns {Promise} - 发送结果
 */
async function sendNotification(subject, content, recipients) {
  try {
    const config = await getConfig();
    const transporter = await createTransporter();
    
    // 如果没有提供收件人，使用配置中的收件人
    if (!recipients || recipients.length === 0) {
      recipients = config.recipients;
    }
    
    if (!recipients || recipients.length === 0) {
      throw new Error('未指定收件人');
    }
    
    const mailOptions = {
      from: `"任务通知" <${config.email.user}>`,
      to: recipients.join(','),
      subject: subject,
      html: content
    };

    console.log('准备发送邮件至:', recipients);
    const info = await transporter.sendMail(mailOptions);
    console.log('邮件发送成功:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('邮件发送失败:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendNotification
}; 