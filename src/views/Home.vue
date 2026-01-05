<template>
  <div class="home">
    <!-- 窗口拖动区域 -->
    <div class="drag-region" data-tauri-drag-region></div>

    <!-- 左侧导航栏 - Lark风格浅色 -->
    <nav class="nav-sidebar">
      <div class="nav-top">
        <div class="user-avatar" :class="getAvatarColor(authStore.user?.id)">
          {{ authStore.user?.nickname?.[0] || 'U' }}
        </div>
      </div>

      <div class="nav-menu">
        <button
          class="nav-item"
          :class="{ active: tab === 'chats' }"
          @click="tab = 'chats'"
        >
          <div class="nav-icon">
            <Icon icon="lucide:message-square" width="22" />
            <span v-if="unreadCount" class="nav-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </div>
          <span class="nav-label">消息</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: tab === 'friends' }"
          @click="tab = 'friends'"
        >
          <div class="nav-icon">
            <Icon icon="lucide:users" width="22" />
          </div>
          <span class="nav-label">通讯录</span>
        </button>
      </div>

      <div class="nav-bottom">
        <button class="nav-item" @click="router.push('/settings')">
          <div class="nav-icon">
            <Icon icon="lucide:settings" width="22" />
          </div>
          <span class="nav-label">设置</span>
        </button>
      </div>
    </nav>

    <!-- 会话/好友列表 -->
    <aside class="list-panel">
      <header class="panel-header">
        <div class="header-search">
          <Icon icon="lucide:search" width="14" />
          <input v-model="listSearchQuery" placeholder="搜索" />
        </div>
        <div class="header-add">
          <button class="add-btn" @click.stop="showCreateGroup = true">
            +
          </button>
        </div>
      </header>

      <!-- 会话列表 -->
      <div v-if="tab === 'chats'" class="list-content">
        <div
          v-for="conv in filteredConversations"
          :key="conv.id"
          class="list-item"
          :class="{ active: conv.id === conversationStore.currentConversationId }"
          @click="selectConversation(conv.id)"
        >
          <div class="item-avatar" :class="getAvatarColor(conv.id)">
            {{ getConversationInitial(conv) }}
          </div>
          <div class="item-body">
            <div class="item-row">
              <span class="item-name">{{ getConversationName(conv) }}</span>
              <span class="item-time">{{ formatTime(conv.updated_at) }}</span>
            </div>
            <div class="item-row">
              <span class="item-preview">{{ getLastMessage(conv) }}</span>
              <span v-if="conv.unread_count" class="item-badge">{{ conv.unread_count }}</span>
            </div>
          </div>
        </div>
        <div v-if="filteredConversations.length === 0" class="empty-state">
          <p>{{ listSearchQuery ? '无匹配结果' : '暂无消息' }}</p>
        </div>
      </div>

      <!-- 成员列表 -->
      <div v-if="tab === 'friends'" class="list-content">
        <div class="list-section">
          <div class="section-title">全部成员</div>
          <div
            v-for="user in filteredFriends"
            :key="user.id"
            class="list-item"
            @click="startChat(user.id)"
          >
            <div class="item-avatar" :class="getAvatarColor(user.id)">{{ user.nickname?.[0] || 'U' }}</div>
            <div class="item-body">
              <div class="item-name">{{ user.nickname }}</div>
              <div class="item-desc">@{{ user.username }}</div>
            </div>
          </div>
          <div v-if="filteredFriends.length === 0" class="empty-hint">
            {{ listSearchQuery ? '无匹配结果' : '暂无成员' }}
          </div>
        </div>
      </div>
    </aside>

    <!-- 聊天区域 -->
    <main class="chat-main">
      <template v-if="conversationStore.currentConversationId">
        <ChatView :conversation-id="conversationStore.currentConversationId" />
      </template>
      <div v-else class="empty-chat">
        <p>选择一个会话开始聊天</p>
      </div>
    </main>

    <!-- 创建群聊弹窗 -->
    <div v-if="showCreateGroup" class="modal-overlay" @click.self="showCreateGroup = false">
      <div class="modal create-group-modal">
        <div class="modal-header">
          <h3>创建群聊</h3>
          <button class="close-btn" @click="showCreateGroup = false">
            <Icon icon="lucide:x" width="16" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>群名称</label>
            <input v-model="newGroupName" placeholder="请输入群名称" />
          </div>
          <div class="form-group">
            <label>选择成员 ({{ selectedFriends.length }} 人)</label>
            <div class="friend-select-list">
              <div
                v-for="user in friendStore.friends"
                :key="user.id"
                class="friend-select-item"
                :class="{ selected: selectedFriends.includes(user.id) }"
                @click="toggleFriendSelection(user.id)"
              >
                <div class="check-box">
                  <Icon v-if="selectedFriends.includes(user.id)" icon="lucide:check" width="14" />
                </div>
                <div class="friend-avatar" :class="getAvatarColor(user.id)">
                  {{ user.nickname?.[0] || 'U' }}
                </div>
                <div class="friend-name">{{ user.nickname }}</div>
              </div>
              <div v-if="friendStore.friends.length === 0" class="empty-hint">
                暂无成员
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" @click="showCreateGroup = false">取消</button>
          <button class="btn primary" @click="createGroup">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConversationStore } from '@/stores/conversation'
import { useFriendStore } from '@/stores/friend'
import { useMessageStore } from '@/stores/message'
import ChatView from '@/components/ChatView.vue'
import type { Conversation } from '@/api/types'
import { Icon } from '@iconify/vue'

const router = useRouter()
const authStore = useAuthStore()
const conversationStore = useConversationStore()
const friendStore = useFriendStore()
const messageStore = useMessageStore()

const tab = ref<'chats' | 'friends'>('chats')
const showCreateGroup = ref(false)
const newGroupName = ref('')
const selectedFriends = ref<string[]>([])
const listSearchQuery = ref('')

const unreadCount = computed(() => {
  return conversationStore.conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
})

// 本地过滤会话列表
const filteredConversations = computed(() => {
  const query = listSearchQuery.value.toLowerCase().trim()
  if (!query) return conversationStore.conversations

  return conversationStore.conversations.filter(conv => {
    const name = getConversationName(conv).toLowerCase()
    const lastMsg = getLastMessage(conv).toLowerCase()
    return name.includes(query) || lastMsg.includes(query)
  })
})

// 本地过滤成员列表
const filteredFriends = computed(() => {
  const query = listSearchQuery.value.toLowerCase().trim()
  if (!query) return friendStore.friends

  return friendStore.friends.filter(user => {
    const nickname = (user.nickname || '').toLowerCase()
    const username = (user.username || '').toLowerCase()
    return nickname.includes(query) || username.includes(query)
  })
})

onMounted(async () => {
  messageStore.initWebSocket()
  await Promise.all([
    conversationStore.fetchConversations(),
    friendStore.fetchFriends()
  ])
})

function getAvatarColor(id?: string): string {
  if (!id) return 'color-1'
  const num = id.charCodeAt(0) % 6 + 1
  return `color-${num}`
}

function getConversationInitial(conv: Conversation): string {
  if (conv.type === 'group') {
    return (conv.name || '群')[0]
  }
  const member = conv.members?.find(m => m.user_id !== authStore.user?.id)
  return member?.user.nickname?.[0] || 'U'
}

function getConversationName(conv: Conversation): string {
  if (conv.type === 'group') {
    return conv.name || '群聊'
  }
  const member = conv.members?.find(m => m.user_id !== authStore.user?.id)
  return member?.user.nickname || '私聊'
}

function getLastMessage(conv: Conversation): string {
  const msg = conv.last_message
  if (!msg) return ''
  if (msg.type === 'text' && msg.content && 'text' in msg.content) {
    return msg.content.text
  }
  if (msg.type === 'image') return '[图片]'
  if (msg.type === 'video') return '[视频]'
  if (msg.type === 'file') return '[文件]'
  return ''
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 604800000) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return days[date.getDay()]
  }
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function selectConversation(id: string) {
  conversationStore.setCurrentConversation(id)
}

async function startChat(userId: string) {
  const convId = await conversationStore.startPrivateChat(userId)
  conversationStore.setCurrentConversation(convId)
  tab.value = 'chats'
}

async function createGroup() {
  if (!newGroupName.value) return
  try {
    await conversationStore.createGroup(newGroupName.value, selectedFriends.value)
    showCreateGroup.value = false
    newGroupName.value = ''
    selectedFriends.value = []
  } catch (e: any) {
    alert(e.message || '创建失败')
  }
}

function toggleFriendSelection(friendId: string) {
  const index = selectedFriends.value.indexOf(friendId)
  if (index >= 0) {
    selectedFriends.value.splice(index, 1)
  } else {
    selectedFriends.value.push(friendId)
  }
}
</script>

<style scoped>
.home {
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

/* 允许按钮等元素可点击 */
.drag-region ~ * {
  position: relative;
}

.nav-sidebar button,
.list-panel button,
.list-panel input,
.chat-main button,
.chat-main input,
.chat-main textarea {
  -webkit-app-region: no-drag;
}

/* 左侧导航栏 - Lark风格 */
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

.nav-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--error);
  color: white;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-bottom {
  width: 100%;
  padding: 0 8px;
}

/* 会话/好友列表面板 */
.list-panel {
  width: 280px;
  background: var(--bg-white);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  padding-top: 12px;
}

.panel-header {
  height: 52px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-light);
}

.header-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f0f0f0;
  border-radius: 6px;
  color: #999;
}

.header-search input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 13px;
  color: var(--text-primary);
}

.header-search input::placeholder {
  color: #bbb;
}

.header-search input:focus {
  outline: none;
  box-shadow: none;
}

.header-add {
  position: relative;
}

.add-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8e8e8;
  color: #333;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 20px;
  font-weight: 300;
  line-height: 1;
}

.add-btn:hover {
  background: #d0d0d0;
}

.add-menu {
  position: absolute;
  top: 36px;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 140px;
  padding: 6px 0;
  z-index: 100;
}

.add-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s;
}

.add-menu-item:hover {
  background: #f5f5f5;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-title svg {
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
}

.list-content {
  flex: 1;
  overflow-y: auto;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.list-item:hover {
  background: var(--bg-hover);
}

.list-item.active {
  background: var(--bg-selected);
}

.item-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 16px;
  color: white;
  flex-shrink: 0;
}

.item-avatar.color-1 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.item-avatar.color-2 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.item-avatar.color-3 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.item-avatar.color-4 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.item-avatar.color-5 { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
.item-avatar.color-6 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

.item-body {
  flex: 1;
  min-width: 0;
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.item-row:first-child {
  margin-bottom: 4px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-time {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.item-preview {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.item-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--error);
  color: white;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.search-input-row {
  display: flex;
  gap: 8px;
}

.search-input-row input {
  flex: 1;
}

.search-result-list {
  margin-top: 16px;
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border-light);
  border-radius: 8px;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-light);
}

.search-result-item:last-child {
  border-bottom: none;
}

.list-section {
  padding-bottom: 8px;
}

.section-title {
  padding: 12px 16px 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
}

.small-btn {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 4px;
  flex-shrink: 0;
}

.small-btn.primary {
  background: var(--primary);
  color: white;
}

.small-btn.primary:hover {
  background: var(--primary-hover);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.empty-hint {
  padding: 20px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary);
}

/* 聊天主区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-main);
  min-width: 0;
}

.empty-chat {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 14px;
}

/* 弹窗 */
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
}

.close-btn {
  width: 28px;
  height: 28px;
  padding: 0;
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

.form-group input {
  width: 100%;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-light);
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
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

/* 创建群聊弹窗 */
.create-group-modal {
  width: 450px;
}

.friend-select-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border-light);
  border-radius: 8px;
}

.friend-select-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.15s;
}

.friend-select-item:last-child {
  border-bottom: none;
}

.friend-select-item:hover {
  background: var(--bg-hover);
}

.friend-select-item.selected {
  background: rgba(51, 112, 255, 0.08);
}

.check-box {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.friend-select-item.selected .check-box {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.friend-avatar {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 13px;
  color: white;
  flex-shrink: 0;
}

.friend-avatar.color-1 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.friend-avatar.color-2 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.friend-avatar.color-3 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.friend-avatar.color-4 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.friend-avatar.color-5 { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
.friend-avatar.color-6 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

.friend-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.empty-hint {
  padding: 30px 20px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}
</style>
