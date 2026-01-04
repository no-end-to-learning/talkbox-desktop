<template>
  <div class="home">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="user-info">
          <div class="avatar">{{ authStore.user?.nickname?.[0] || 'U' }}</div>
          <span class="username">{{ authStore.user?.nickname }}</span>
        </div>
        <div class="actions">
          <button class="icon-btn" @click="showCreateGroup = true" title="创建群聊">+</button>
          <button class="icon-btn" @click="router.push('/settings')" title="设置">⚙</button>
        </div>
      </div>

      <div class="tabs">
        <button :class="{ active: tab === 'chats' }" @click="tab = 'chats'">会话</button>
        <button :class="{ active: tab === 'friends' }" @click="tab = 'friends'">好友</button>
      </div>

      <div class="conversation-list" v-if="tab === 'chats'">
        <div
          v-for="conv in conversationStore.conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: conv.id === conversationStore.currentConversationId }"
          @click="selectConversation(conv.id)"
        >
          <div class="avatar">{{ getConversationName(conv)?.[0] || 'G' }}</div>
          <div class="info">
            <div class="name">{{ getConversationName(conv) }}</div>
            <div class="time">{{ formatTime(conv.updated_at) }}</div>
          </div>
        </div>
        <div v-if="conversationStore.conversations.length === 0" class="empty">
          暂无会话
        </div>
      </div>

      <div class="friend-list" v-if="tab === 'friends'">
        <div class="search-box">
          <input v-model="searchQuery" placeholder="搜索用户" @keyup.enter="searchUsers" />
        </div>
        <div v-if="searchResults.length > 0" class="search-results">
          <div v-for="user in searchResults" :key="user.id" class="friend-item">
            <div class="avatar">{{ user.nickname?.[0] || 'U' }}</div>
            <div class="info">
              <div class="name">{{ user.nickname }}</div>
              <div class="username">@{{ user.username }}</div>
            </div>
            <button class="default" @click="addFriend(user.id)">添加</button>
          </div>
        </div>
        <div v-if="friendStore.requests.length > 0" class="requests">
          <h4>好友请求</h4>
          <div v-for="req in friendStore.requests" :key="req.id" class="friend-item">
            <div class="avatar">{{ req.friend.nickname?.[0] || 'U' }}</div>
            <div class="info">
              <div class="name">{{ req.friend.nickname }}</div>
            </div>
            <button class="primary" @click="acceptFriend(req.friend.id)">接受</button>
          </div>
        </div>
        <div class="friends">
          <div v-for="friend in friendStore.friends" :key="friend.id" class="friend-item" @click="startChat(friend.friend.id)">
            <div class="avatar">{{ friend.friend.nickname?.[0] || 'U' }}</div>
            <div class="info">
              <div class="name">{{ friend.friend.nickname }}</div>
              <div class="username">@{{ friend.friend.username }}</div>
            </div>
          </div>
        </div>
        <div v-if="friendStore.friends.length === 0 && friendStore.requests.length === 0" class="empty">
          暂无好友
        </div>
      </div>
    </aside>

    <main class="chat-area">
      <template v-if="conversationStore.currentConversationId">
        <ChatView :conversation-id="conversationStore.currentConversationId" />
      </template>
      <div v-else class="empty-chat">
        <p>选择一个会话开始聊天</p>
      </div>
    </main>

    <div v-if="showCreateGroup" class="modal-overlay" @click.self="showCreateGroup = false">
      <div class="modal">
        <h3>创建群聊</h3>
        <div class="form-item">
          <label>群名称</label>
          <input v-model="newGroupName" placeholder="请输入群名称" />
        </div>
        <div class="modal-actions">
          <button class="default" @click="showCreateGroup = false">取消</button>
          <button class="primary" @click="createGroup">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConversationStore } from '@/stores/conversation'
import { useFriendStore } from '@/stores/friend'
import { useMessageStore } from '@/stores/message'
import ChatView from '@/components/ChatView.vue'
import type { Conversation, User } from '@/api/types'

const router = useRouter()
const authStore = useAuthStore()
const conversationStore = useConversationStore()
const friendStore = useFriendStore()
const messageStore = useMessageStore()

const tab = ref<'chats' | 'friends'>('chats')
const showCreateGroup = ref(false)
const newGroupName = ref('')
const searchQuery = ref('')
const searchResults = ref<User[]>([])

onMounted(async () => {
  messageStore.initWebSocket()
  await Promise.all([
    conversationStore.fetchConversations(),
    friendStore.fetchFriends(),
    friendStore.fetchRequests()
  ])
})

function getConversationName(conv: Conversation): string {
  if (conv.type === 'group') {
    return conv.name || '群聊'
  }
  const member = conv.members?.find(m => m.user_id !== authStore.user?.id)
  return member?.user.nickname || '私聊'
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return date.toLocaleDateString()
}

function selectConversation(id: string) {
  conversationStore.setCurrentConversation(id)
}

async function searchUsers() {
  if (!searchQuery.value) {
    searchResults.value = []
    return
  }
  searchResults.value = await friendStore.searchUsers(searchQuery.value)
}

async function addFriend(userId: string) {
  try {
    await friendStore.sendRequest(userId)
    searchResults.value = searchResults.value.filter(u => u.id !== userId)
  } catch (e: any) {
    alert(e.message || '添加失败')
  }
}

async function acceptFriend(userId: string) {
  await friendStore.acceptRequest(userId)
}

async function startChat(userId: string) {
  const convId = await conversationStore.startPrivateChat(userId)
  conversationStore.setCurrentConversation(convId)
  tab.value = 'chats'
}

async function createGroup() {
  if (!newGroupName.value) return
  await conversationStore.createGroup(newGroupName.value, [])
  showCreateGroup.value = false
  newGroupName.value = ''
}
</script>

<style scoped>
.home {
  height: 100%;
  display: flex;
}

.sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg);
  border: none;
  cursor: pointer;
  font-size: 16px;
}

.icon-btn:hover {
  background: var(--border);
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
}

.tabs button {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
}

.tabs button.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.conversation-list, .friend-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item, .friend-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.conversation-item:hover, .friend-item:hover {
  background: var(--bg);
}

.conversation-item.active {
  background: #e6f7ff;
}

.info {
  flex: 1;
  min-width: 0;
}

.info .name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info .time, .info .username {
  font-size: 12px;
  color: var(--text-secondary);
}

.search-box {
  padding: 12px 16px;
}

.search-box input {
  width: 100%;
}

.requests h4 {
  padding: 8px 16px;
  color: var(--text-secondary);
  font-size: 12px;
}

.empty {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.empty-chat {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
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
  width: 400px;
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

.form-item input {
  width: 100%;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
