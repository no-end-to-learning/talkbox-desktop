<template>
  <div class="settings-view">
    <!-- 窗口拖动区域 -->
    <div class="drag-region" data-tauri-drag-region></div>

    <!-- 左侧导航栏 -->
    <nav class="nav-sidebar">
      <div class="nav-top">
        <div class="user-avatar" :class="getAvatarColor(authStore.user?.id)">
          {{ authStore.user?.nickname?.[0] || 'U' }}
        </div>
      </div>

      <div class="nav-menu">
        <button class="nav-item" @click="router.push('/')">
          <div class="nav-icon">
            <Icon icon="lucide:message-square" width="22" />
          </div>
          <span class="nav-label">消息</span>
        </button>
        <button class="nav-item" @click="router.push('/')">
          <div class="nav-icon">
            <Icon icon="lucide:users" width="22" />
          </div>
          <span class="nav-label">通讯录</span>
        </button>
      </div>

      <div class="nav-bottom">
        <button class="nav-item active">
          <div class="nav-icon">
            <Icon icon="lucide:settings" width="22" />
          </div>
          <span class="nav-label">设置</span>
        </button>
      </div>
    </nav>

    <!-- 设置内容 -->
    <main class="settings-content">
      <header class="settings-header">
        <h2>设置</h2>
      </header>

      <div class="settings-body">
        <!-- 个人信息 -->
        <section class="settings-section">
          <h3>个人信息</h3>
          <div class="profile-card">
            <div class="profile-avatar" :class="getAvatarColor(authStore.user?.id)">
              {{ authStore.user?.nickname?.[0] || 'U' }}
            </div>
            <div class="profile-info">
              <div class="profile-name">{{ authStore.user?.nickname || authStore.user?.username }}</div>
              <div class="profile-username">@{{ authStore.user?.username }}</div>
            </div>
          </div>
          <div class="form-row">
            <label>昵称</label>
            <div class="input-group">
              <input v-model="nickname" placeholder="请输入昵称" />
              <button class="btn primary" @click="updateProfile">保存</button>
            </div>
          </div>
        </section>

        <!-- Bot 管理 -->
        <section class="settings-section">
          <div class="section-header">
            <div>
              <h3>Bot 管理</h3>
              <p class="section-desc">创建和管理你的 Bot，用于自动发送消息到群聊。</p>
            </div>
            <button class="btn primary" @click="showCreateBot = true">
              <Icon icon="lucide:plus" width="16" />
              创建 Bot
            </button>
          </div>

          <div class="bot-list">
            <div v-for="bot in botStore.bots" :key="bot.id" class="bot-item">
              <div class="bot-avatar" :class="getAvatarColor(bot.id)">{{ bot.name[0] }}</div>
              <div class="bot-info">
                <div class="bot-name">{{ bot.name }}</div>
                <div class="bot-desc">{{ bot.description || '暂无描述' }}</div>
              </div>
              <div class="bot-actions">
                <button class="btn-icon" @click="showBotToken(bot)" title="查看 Token">
                  <Icon icon="lucide:lock" width="28" />
                </button>
                <button class="btn-icon" @click="editBot(bot)" title="编辑">
                  <Icon icon="lucide:pencil" width="28" />
                </button>
                <button class="btn-icon danger" @click="deleteBot(bot.id)" title="删除">
                  <Icon icon="lucide:trash-2" width="28" />
                </button>
              </div>
            </div>
            <div v-if="botStore.bots.length === 0" class="empty-state">
              <p>暂无 Bot，点击上方按钮创建</p>
            </div>
          </div>
        </section>

        <!-- 账号操作 -->
        <section class="settings-section">
          <h3>账号</h3>
          <button class="btn danger" @click="logout">
            <Icon icon="lucide:log-out" width="16" />
            退出登录
          </button>
        </section>
      </div>
    </main>

    <!-- 创建/编辑 Bot 弹窗 -->
    <div v-if="showCreateBot" class="modal-overlay" @click.self="closeBotModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingBot ? '编辑 Bot' : '创建 Bot' }}</h3>
          <button class="close-btn" @click="closeBotModal">
            <Icon icon="lucide:x" width="16" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>名称</label>
            <input v-model="botForm.name" placeholder="Bot 名称" />
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="botForm.description" placeholder="Bot 描述（可选）" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" @click="closeBotModal">取消</button>
          <button class="btn primary" @click="saveBot">{{ editingBot ? '保存' : '创建' }}</button>
        </div>
      </div>
    </div>

    <!-- Token 弹窗 -->
    <div v-if="showTokenModal" class="modal-overlay" @click.self="showTokenModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Bot Token</h3>
          <button class="close-btn" @click="showTokenModal = false">
            <Icon icon="lucide:x" width="16" />
          </button>
        </div>
        <div class="modal-body">
          <p class="token-warning">请妥善保管 Token，不要泄露给他人</p>
          <div class="token-box">
            <code>{{ currentToken }}</code>
            <button class="btn secondary" @click="copyToken">复制</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" @click="regenerateToken">重新生成</button>
          <button class="btn primary" @click="showTokenModal = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- Toast 提示 -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBotStore } from '@/stores/bot'
import type { Bot } from '@/api/types'
import { Icon } from '@iconify/vue'

const router = useRouter()
const authStore = useAuthStore()
const botStore = useBotStore()

const nickname = ref('')

// Bot 管理相关
const showCreateBot = ref(false)
const showTokenModal = ref(false)
const editingBot = ref<Bot | null>(null)
const currentToken = ref('')
const currentBotId = ref('')

const botForm = reactive({
  name: '',
  description: ''
})

const toast = reactive({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error'
})

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.show = true
  toast.message = message
  toast.type = type
  setTimeout(() => {
    toast.show = false
  }, 2000)
}

onMounted(() => {
  nickname.value = authStore.user?.nickname || ''
  botStore.fetchBots()
})

function getAvatarColor(id?: string): string {
  if (!id) return 'color-1'
  const num = id.charCodeAt(0) % 6 + 1
  return `color-${num}`
}

async function updateProfile() {
  try {
    await authStore.updateProfile({ nickname: nickname.value })
    alert('保存成功')
  } catch (e: any) {
    alert(e.message || '保存失败')
  }
}

function logout() {
  authStore.logout()
  router.push('/login')
}

// Bot 管理方法
function editBot(bot: Bot) {
  editingBot.value = bot
  botForm.name = bot.name
  botForm.description = bot.description || ''
  showCreateBot.value = true
}

function closeBotModal() {
  showCreateBot.value = false
  editingBot.value = null
  botForm.name = ''
  botForm.description = ''
}

async function saveBot() {
  if (!botForm.name) {
    alert('请输入 Bot 名称')
    return
  }

  try {
    if (editingBot.value) {
      await botStore.updateBot(editingBot.value.id, botForm)
    } else {
      const bot = await botStore.createBot(botForm)
      currentToken.value = bot.token
      currentBotId.value = bot.id
      showTokenModal.value = true
    }
    closeBotModal()
  } catch (e: any) {
    alert(e.message || '操作失败')
  }
}

async function deleteBot(id: string) {
  // 直接执行删除，不使用 confirm（Tauri 中可能不工作）
  try {
    await botStore.deleteBot(id)
    showToast('删除成功')
  } catch (e: any) {
    console.error('Delete bot error:', e)
    showToast(e.message || '删除失败', 'error')
  }
}

function showBotToken(bot: Bot) {
  currentToken.value = bot.token || ''
  currentBotId.value = bot.id
  showTokenModal.value = true
}

async function regenerateToken() {
  try {
    const newToken = await botStore.regenerateToken(currentBotId.value)
    currentToken.value = newToken
    showToast('Token 已重新生成')
  } catch (e: any) {
    console.error('Regenerate token error:', e)
    showToast(e.message || '重新生成失败', 'error')
  }
}

function copyToken() {
  navigator.clipboard.writeText(currentToken.value)
  showToast('已复制到剪贴板')
}
</script>

<style scoped>
.settings-view {
  height: 100%;
  display: flex;
  background: var(--bg-white);
  position: relative;
}

.drag-region {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 20px;
  -webkit-app-region: drag;
  z-index: 100;
}

.nav-sidebar button,
.settings-content button,
.settings-content input {
  -webkit-app-region: no-drag;
}

/* 左侧导航栏 */
.nav-sidebar {
  width: 72px;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  border-right: 1px solid var(--border-light);
  /* macOS traffic lights 区域 */
  padding-top: 40px;
}

.nav-top {
  margin-bottom: 16px;
  padding-top: 0;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  color: white;
  cursor: pointer;
}

.user-avatar.color-1 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.user-avatar.color-2 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.user-avatar.color-3 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.user-avatar.color-4 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.user-avatar.color-5 { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
.user-avatar.color-6 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 0 8px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.15s;
  width: 100%;
}

.nav-icon {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
}

.nav-item:hover {
  background: rgba(51, 112, 255, 0.08);
  color: var(--primary);
}

.nav-item.active {
  background: rgba(51, 112, 255, 0.12);
  color: var(--primary);
}

.nav-bottom {
  width: 100%;
  padding: 0 8px;
}

/* 设置内容 */
.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.settings-header {
  height: 52px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-white);
}

.settings-header h2 {
  font-size: 16px;
  font-weight: 600;
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg-main);
}

.settings-section {
  background: var(--bg-white);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.settings-section h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.section-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-main);
  border-radius: 8px;
  margin-bottom: 20px;
}

.profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 20px;
  color: white;
}

.profile-avatar.color-1 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.profile-avatar.color-2 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.profile-avatar.color-3 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.profile-avatar.color-4 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.profile-avatar.color-5 { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
.profile-avatar.color-6 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.profile-username {
  font-size: 13px;
  color: var(--text-secondary);
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-row label {
  font-size: 14px;
  color: var(--text-secondary);
  width: 60px;
  flex-shrink: 0;
}

.input-group {
  flex: 1;
  display: flex;
  gap: 8px;
}

.input-group input {
  flex: 1;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
}

.btn svg {
  width: 16px;
  height: 16px;
}

.btn.primary {
  background: var(--primary);
  color: white;
}

.btn.primary:hover {
  background: var(--primary-hover);
}

.btn.secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn.secondary:hover {
  background: var(--bg-active);
}

.btn.danger {
  background: var(--error);
  color: white;
}

.btn.danger:hover {
  background: #ff5f57;
}

/* Bot 管理样式 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.section-header h3 {
  margin-bottom: 4px;
}

.section-header .section-desc {
  margin-bottom: 0;
}

.bot-list {
  margin-top: 16px;
}

.bot-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  margin-bottom: 8px;
}

.bot-item:last-child {
  margin-bottom: 0;
}

.bot-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  color: white;
  flex-shrink: 0;
}

.bot-avatar.color-1 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.bot-avatar.color-2 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.bot-avatar.color-3 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.bot-avatar.color-4 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.bot-avatar.color-5 { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
.bot-avatar.color-6 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

.bot-info {
  flex: 1;
  min-width: 0;
}

.bot-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.bot-desc {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bot-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-hover);
  color: var(--text-secondary);
  transition: all 0.15s;
}

.btn-icon:hover {
  background: var(--bg-active);
  color: var(--primary);
}

.btn-icon.danger {
  color: var(--error);
}

.btn-icon.danger:hover {
  background: #fff1f0;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-white);
  border-radius: 12px;
  width: 400px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--text-tertiary);
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input,
.form-group textarea {
  width: 100%;
}

.form-group textarea {
  resize: none;
  padding: 10px 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-light);
}

.token-warning {
  color: #faad14;
  font-size: 13px;
  margin-bottom: 12px;
}

.token-box {
  display: flex;
  gap: 12px;
  align-items: center;
  background: var(--bg-main);
  padding: 12px;
  border-radius: 6px;
}

.token-box code {
  flex: 1;
  font-size: 12px;
  word-break: break-all;
  font-family: 'SF Mono', Monaco, monospace;
}

/* Toast 提示 */
.toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  color: white;
  z-index: 2000;
  animation: toast-in 0.3s ease;
}

.toast.success {
  background: #52c41a;
}

.toast.error {
  background: var(--error);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
