<template>
  <div class="bot-page">
    <div class="bot-card">
      <div class="header">
        <h2>Bot 管理</h2>
        <button class="primary" @click="showCreate = true">创建 Bot</button>
      </div>

      <div class="bot-list">
        <div v-for="bot in botStore.bots" :key="bot.id" class="bot-item">
          <div class="avatar">{{ bot.name[0] }}</div>
          <div class="info">
            <div class="name">{{ bot.name }}</div>
            <div class="desc">{{ bot.description || '暂无描述' }}</div>
          </div>
          <div class="actions">
            <button class="default" @click="showToken(bot)">Token</button>
            <button class="default" @click="editBot(bot)">编辑</button>
            <button class="danger-text" @click="deleteBot(bot.id)">删除</button>
          </div>
        </div>
        <div v-if="botStore.bots.length === 0" class="empty">
          暂无 Bot，点击上方按钮创建
        </div>
      </div>

      <button class="back" @click="router.push('/settings')">← 返回设置</button>
    </div>

    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <h3>{{ editingBot ? '编辑 Bot' : '创建 Bot' }}</h3>
        <div class="form-item">
          <label>名称</label>
          <input v-model="form.name" placeholder="Bot 名称" />
        </div>
        <div class="form-item">
          <label>描述</label>
          <textarea v-model="form.description" placeholder="Bot 描述（可选）" rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button class="default" @click="closeModal">取消</button>
          <button class="primary" @click="saveBot">{{ editingBot ? '保存' : '创建' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showTokenModal" class="modal-overlay" @click.self="showTokenModal = false">
      <div class="modal">
        <h3>Bot Token</h3>
        <p class="token-warning">请妥善保管 Token，不要泄露给他人</p>
        <div class="token-box">
          <code>{{ currentToken }}</code>
          <button class="default" @click="copyToken">复制</button>
        </div>
        <div class="modal-actions">
          <button class="default" @click="regenerateToken">重新生成</button>
          <button class="primary" @click="showTokenModal = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useBotStore } from '@/stores/bot'
import type { Bot } from '@/api/types'

const router = useRouter()
const botStore = useBotStore()

const showCreate = ref(false)
const showTokenModal = ref(false)
const editingBot = ref<Bot | null>(null)
const currentToken = ref('')
const currentBotId = ref('')

const form = reactive({
  name: '',
  description: ''
})

onMounted(() => {
  botStore.fetchBots()
})

function editBot(bot: Bot) {
  editingBot.value = bot
  form.name = bot.name
  form.description = bot.description
  showCreate.value = true
}

function closeModal() {
  showCreate.value = false
  editingBot.value = null
  form.name = ''
  form.description = ''
}

async function saveBot() {
  if (!form.name) {
    alert('请输入 Bot 名称')
    return
  }

  try {
    if (editingBot.value) {
      await botStore.updateBot(editingBot.value.id, form)
    } else {
      const bot = await botStore.createBot(form)
      currentToken.value = bot.token
      currentBotId.value = bot.id
      showTokenModal.value = true
    }
    closeModal()
  } catch (e: any) {
    alert(e.message || '操作失败')
  }
}

async function deleteBot(id: string) {
  if (!confirm('确定要删除这个 Bot 吗？')) return
  await botStore.deleteBot(id)
}

function showToken(bot: Bot) {
  currentToken.value = bot.token || ''
  currentBotId.value = bot.id
  showTokenModal.value = true
}

async function regenerateToken() {
  if (!confirm('重新生成后，旧 Token 将失效，确定继续吗？')) return
  currentToken.value = await botStore.regenerateToken(currentBotId.value)
}

function copyToken() {
  navigator.clipboard.writeText(currentToken.value)
  alert('已复制到剪贴板')
}
</script>

<style scoped>
.bot-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.bot-card {
  background: white;
  padding: 40px;
  border-radius: 8px;
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.bot-list {
  margin-bottom: 24px;
}

.bot-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 12px;
}

.bot-item .info {
  flex: 1;
}

.bot-item .name {
  font-weight: 500;
  margin-bottom: 4px;
}

.bot-item .desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.bot-item .actions {
  display: flex;
  gap: 8px;
}

.danger-text {
  background: none;
  color: var(--error);
  padding: 8px;
}

.danger-text:hover {
  background: #fff1f0;
}

.empty {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}

.back {
  background: none;
  color: var(--primary);
  padding: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 450px;
}

.modal h3 {
  margin-bottom: 20px;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.form-item input, .form-item textarea {
  width: 100%;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.token-warning {
  color: var(--warning);
  font-size: 13px;
  margin-bottom: 12px;
}

.token-box {
  display: flex;
  gap: 12px;
  align-items: center;
  background: var(--bg);
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.token-box code {
  flex: 1;
  font-size: 12px;
  word-break: break-all;
}
</style>
