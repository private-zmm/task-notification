document.addEventListener('DOMContentLoaded', function() {
  // DOM 元素
  const taskList = document.getElementById('taskList');
  const noTasksMessage = document.getElementById('noTasksMessage');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
  const testEmailModal = new bootstrap.Modal(document.getElementById('testEmailModal'));
  const emailConfigModal = new bootstrap.Modal(document.getElementById('emailConfigModal'));
  const importConfigModal = new bootstrap.Modal(document.getElementById('importConfigModal'));
  const taskForm = document.getElementById('taskForm');
  const emailConfigForm = document.getElementById('emailConfigForm');
  const saveTaskBtn = document.getElementById('saveTaskBtn');
  const saveEmailBtn = document.getElementById('saveEmailBtn');
  const testEmailBtn = document.getElementById('testEmailBtn');
  const sendTestEmailBtn = document.getElementById('sendTestEmailBtn');
  const exportConfigBtn = document.getElementById('exportConfigBtn');
  const importConfigBtn = document.getElementById('importConfigBtn');
  const configFileInput = document.getElementById('configFileInput');
  const confirmImportBtn = document.getElementById('confirmImportBtn');
  
  // 提醒方式选择事件
  const reminderDaily = document.getElementById('reminderDaily');
  const reminderWeekly = document.getElementById('reminderWeekly');
  const weekdaySelector = document.getElementById('weekdaySelector');
  
  reminderDaily.addEventListener('change', updateReminderTypeUI);
  reminderWeekly.addEventListener('change', updateReminderTypeUI);
  
  function updateReminderTypeUI() {
    if (reminderWeekly.checked) {
      weekdaySelector.style.display = 'block';
    } else {
      weekdaySelector.style.display = 'none';
    }
  }
  
  // 初始化页面
  loadEmailConfig();
  loadTasks();
  
  // 事件监听
  addTaskBtn.addEventListener('click', () => {
    resetTaskForm();
    document.getElementById('taskModalTitle').textContent = '添加任务';
    taskModal.show();
  });
  
  document.querySelector('.btn-settings').addEventListener('click', () => {
    emailConfigModal.show();
  });
  
  saveTaskBtn.addEventListener('click', saveTask);
  saveEmailBtn.addEventListener('click', saveEmailConfig);
  testEmailBtn.addEventListener('click', () => testEmailModal.show());
  sendTestEmailBtn.addEventListener('click', sendTestEmail);
  
  // 导出配置事件
  exportConfigBtn.addEventListener('click', exportConfig);
  
  // 导入配置事件
  importConfigBtn.addEventListener('click', () => {
    configFileInput.click();
  });
  
  configFileInput.addEventListener('change', handleConfigFileSelect);
  confirmImportBtn.addEventListener('click', importConfig);
  
  // 导出配置功能
  function exportConfig() {
    // 创建一个链接，指向导出API
    const link = document.createElement('a');
    link.href = '/api/config/export';
    link.download = 'task-notification-config.json';
    
    // 模拟点击链接触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // 处理导入配置文件选择
  let selectedConfigFile = null;
  
  function handleConfigFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        // 解析JSON文件内容
        const content = e.target.result;
        const config = JSON.parse(content);
        
        // 显示配置预览
        document.getElementById('importConfigContent').textContent = JSON.stringify(config, null, 2);
        
        // 保存选中的配置
        selectedConfigFile = config;
        
        // 显示确认对话框
        importConfigModal.show();
      } catch (error) {
        showAlert('无效的JSON文件', 'danger');
      }
    };
    reader.readAsText(file);
  }
  
  // 导入配置
  async function importConfig() {
    if (!selectedConfigFile) {
      showAlert('未选择配置文件', 'warning');
      return;
    }
    
    try {
      const response = await fetch('/api/config/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedConfigFile)
      });
      
      const result = await response.json();
      
      importConfigModal.hide();
      
      if (result.success) {
        showAlert('配置导入成功', 'success');
        
        // 重新加载页面以应用新配置
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        showAlert(`配置导入失败: ${result.error}`, 'danger');
      }
    } catch (error) {
      console.error('配置导入失败:', error);
      showAlert('配置导入失败', 'danger');
    } finally {
      // 清除文件选择
      configFileInput.value = '';
      selectedConfigFile = null;
    }
  }
  
  // 加载邮件配置
  async function loadEmailConfig() {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      
      if (config.email) {
        document.getElementById('emailHost').value = config.email.host || '';
        document.getElementById('emailPort').value = config.email.port || '';
        document.getElementById('emailSecure').value = config.email.secure ? 'true' : 'false';
        document.getElementById('emailUser').value = config.email.user || '';
        // 不填充密码，为了安全
      }
    } catch (error) {
      console.error('加载邮件配置失败:', error);
      showAlert('加载邮件配置失败', 'danger');
    }
  }
  
  // 保存邮件配置
  async function saveEmailConfig() {
    try {
      const emailData = {
        host: document.getElementById('emailHost').value,
        port: parseInt(document.getElementById('emailPort').value),
        secure: document.getElementById('emailSecure').value === 'true',
        user: document.getElementById('emailUser').value
      };
      
      const password = document.getElementById('emailPass').value;
      if (password) {
        emailData.pass = password;
      }
      
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        emailConfigModal.hide();
        showAlert('邮件配置已保存', 'success');
        document.getElementById('emailPass').value = ''; // 清除密码
      } else {
        showAlert('保存邮件配置失败', 'danger');
      }
    } catch (error) {
      console.error('保存邮件配置失败:', error);
      showAlert('保存邮件配置失败', 'danger');
    }
  }
  
  // 发送测试邮件
  async function sendTestEmail() {
    const recipient = document.getElementById('testEmailRecipient').value;
    
    if (!recipient) {
      showAlert('请输入收件人邮箱', 'warning');
      return;
    }
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipients: [recipient],
          subject: '测试邮件',
          content: `<h3>这是一封测试邮件</h3>
                    <p>如果您收到此邮件，说明您的邮件配置正确。</p>
                    <p>时间: ${new Date().toLocaleString('zh-CN')}</p>`
        })
      });
      
      const result = await response.json();
      
      testEmailModal.hide();
      
      if (result.success) {
        showAlert('测试邮件已发送', 'success');
      } else {
        showAlert(`发送测试邮件失败: ${result.error || '未知错误'}`, 'danger');
      }
    } catch (error) {
      console.error('发送测试邮件失败:', error);
      showAlert('发送测试邮件失败', 'danger');
    }
  }
  
  // 加载任务列表
  async function loadTasks() {
    try {
      const response = await fetch('/api/tasks');
      const tasks = await response.json();
      
      renderTaskList(tasks);
    } catch (error) {
      console.error('加载任务列表失败:', error);
      showAlert('加载任务列表失败', 'danger');
    }
  }
  
  // 渲染任务列表
  function renderTaskList(tasks) {
    taskList.innerHTML = '';
    
    if (!tasks || tasks.length === 0) {
      noTasksMessage.style.display = 'block';
      return;
    }
    
    noTasksMessage.style.display = 'none';
    
    tasks.forEach(task => {
      const { schedule, enabled, name, subject, recipients, id } = task;
      
      // 解析cron表达式获取时间和提醒方式
      const cronParts = schedule.split(' ');
      const minutes = cronParts[0];
      const hours = cronParts[1];
      const dayOfMonth = cronParts[2];
      const month = cronParts[3];
      const dayOfWeek = cronParts[4];
      
      let reminderType = '每天';
      let reminderClass = 'every-day';
      let weekdays = [];
      let timeStr = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      
      if (dayOfWeek !== '*') {
        reminderType = '每周';
        reminderClass = 'every-week';
        
        // 解析星期
        const days = dayOfWeek.split(',');
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
        weekdays = days.map(d => dayNames[d]);
        
        if (weekdays.length > 0) {
          reminderType = `每周(${weekdays.join(',')})`;
        }
      }
      
      const row = document.createElement('tr');
      if (!enabled) {
        row.classList.add('disabled');
      }
      
      row.dataset.id = id;
      
      // 收件人格式化
      const recipientsList = Array.isArray(recipients) ? recipients.join(', ') : recipients;
      
      row.innerHTML = `
        <td>
          <div class="form-check form-switch">
            <input class="form-check-input task-toggle" type="checkbox" role="switch" 
              id="switch-${id}" ${enabled ? 'checked' : ''}>
          
          </div>
        </td>
        <td>${name || subject}</td>
        <td><span class="reminder-type ${reminderClass}">${reminderType}</span></td>
        <td class="task-time">${timeStr}</td>
        <td>
          <button class="btn btn-sm btn-primary btn-action edit-task">编辑</button>
          <button class="btn btn-sm btn-danger btn-action delete-task">删除</button>
        </td>
      `;
      
      taskList.appendChild(row);
      
      // 添加事件监听器
      const switchEl = row.querySelector(`#switch-${id}`);
      switchEl.addEventListener('change', () => toggleTaskStatus(id, switchEl.checked));
      
      row.querySelector('.edit-task').addEventListener('click', () => editTask(task));
      row.querySelector('.delete-task').addEventListener('click', () => deleteTask(id));
    });
  }
  
  // 重置任务表单
  function resetTaskForm() {
    document.getElementById('taskId').value = '';
    document.getElementById('taskName').value = '';
    document.getElementById('taskTime').value = '09:00';
    document.getElementById('taskSubject').value = '';
    document.getElementById('taskContent').value = '';
    document.getElementById('taskRecipients').value = '';
    document.getElementById('taskEnabled').checked = true;
    
    reminderDaily.checked = true;
    reminderWeekly.checked = false;
    updateReminderTypeUI();
    
    // 清除星期选择
    document.querySelectorAll('.weekday-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
  }
  
  // 编辑任务
  function editTask(task) {
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskName').value = task.name || '';
    document.getElementById('taskSubject').value = task.subject || '';
    document.getElementById('taskContent').value = task.content || '';
    document.getElementById('taskRecipients').value = Array.isArray(task.recipients) ? task.recipients.join('\n') : (task.recipients || '');
    document.getElementById('taskEnabled').checked = task.enabled;
    
    // 解析cron表达式
    const cronParts = task.schedule.split(' ');
    const minutes = cronParts[0];
    const hours = cronParts[1];
    const dayOfWeek = cronParts[4];
    
    // 设置时间
    document.getElementById('taskTime').value = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    
    // 设置提醒方式
    if (dayOfWeek === '*') {
      reminderDaily.checked = true;
      reminderWeekly.checked = false;
    } else {
      reminderDaily.checked = false;
      reminderWeekly.checked = true;
      
      // 设置星期
      const days = dayOfWeek.split(',');
      document.querySelectorAll('.weekday-checkbox').forEach(checkbox => {
        checkbox.checked = days.includes(checkbox.value);
      });
    }
    
    updateReminderTypeUI();
    
    document.getElementById('taskModalTitle').textContent = '编辑任务';
    taskModal.show();
  }
  
  // 保存任务
  async function saveTask() {
    const taskId = document.getElementById('taskId').value;
    const taskName = document.getElementById('taskName').value;
    const taskSubject = document.getElementById('taskSubject').value;
    const taskContent = document.getElementById('taskContent').value;
    const taskEnabled = document.getElementById('taskEnabled').checked;
    
    // 解析收件人列表
    let recipients = document.getElementById('taskRecipients').value;
    recipients = recipients.split(/[\n,]/).map(email => email.trim()).filter(email => email);
    
    // 解析时间
    const timeValue = document.getElementById('taskTime').value;
    const [hours, minutes] = timeValue.split(':');
    
    // 构建cron表达式
    let schedule;
    if (reminderDaily.checked) {
      schedule = `${minutes} ${hours} * * *`; // 每天
    } else {
      // 获取选中的星期
      const selectedDays = [];
      document.querySelectorAll('.weekday-checkbox:checked').forEach(checkbox => {
        selectedDays.push(checkbox.value);
      });
      
      if (selectedDays.length === 0) {
        showAlert('请至少选择一个星期', 'warning');
        return;
      }
      
      schedule = `${minutes} ${hours} * * ${selectedDays.join(',')}`; // 每周特定日
    }
    
    const taskData = {
      name: taskName,
      schedule: schedule,
      subject: taskSubject,
      content: taskContent,
      recipients: recipients,
      enabled: taskEnabled
    };
    
    try {
      let response;
      
      if (taskId) {
        // 更新现有任务
        response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(taskData)
        });
      } else {
        // 创建新任务
        response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(taskData)
        });
      }
      
      const result = await response.json();
      
      if (result.success) {
        taskModal.hide();
        showAlert(taskId ? '任务已更新' : '任务已创建', 'success');
        loadTasks();
      } else {
        showAlert(taskId ? '更新任务失败' : '创建任务失败', 'danger');
      }
    } catch (error) {
      console.error('保存任务失败:', error);
      showAlert('保存任务失败', 'danger');
    }
  }
  
  // 切换任务状态
  async function toggleTaskStatus(taskId, enabled) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showAlert(`任务已${enabled ? '启用' : '禁用'}`, 'success');
        loadTasks(); // 重新加载以更新状态文本
      } else {
        showAlert(`${enabled ? '启用' : '禁用'}任务失败`, 'danger');
        loadTasks(); // 重新加载以还原状态
      }
    } catch (error) {
      console.error('更改任务状态失败:', error);
      showAlert('更改任务状态失败', 'danger');
      loadTasks(); // 重新加载以还原状态
    }
  }
  
  // 删除任务
  async function deleteTask(taskId) {
    if (!confirm('确定要删除此任务吗？此操作无法撤销。')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        showAlert('任务已删除', 'success');
        loadTasks();
      } else {
        showAlert('删除任务失败', 'danger');
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      showAlert('删除任务失败', 'danger');
    }
  }
  
  // 显示提示信息
  function showAlert(message, type = 'info') {
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertEl.setAttribute('role', 'alert');
    alertEl.style.zIndex = '9999';
    alertEl.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="关闭"></button>
    `;
    
    document.body.appendChild(alertEl);
    
    // 3秒后自动关闭
    setTimeout(() => {
      alertEl.classList.remove('show');
      setTimeout(() => alertEl.remove(), 150);
    }, 3000);
  }
}); 