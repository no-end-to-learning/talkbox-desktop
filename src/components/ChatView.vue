<template>
  <div class="chat-view">
    <header class="chat-header">
      <div class="title">{{ conversationName }}</div>
      <div class="actions">
        <button class="icon-btn" @click="showSearch = !showSearch">🔍</button>
      </div>
    </header>

    <div v-if="showSearch" class="search-bar">
      <input v-model="searchQuery" placeholder="搜索消息..." @keyup.enter="searchMessages" />
      <button class="primary" @click="searchMessages">搜索</button>
    </div>

    <div class="message-list" ref="messageListRef" @scroll="handleScroll">
      <div v-if="loading" class="loading">加载中...</div>
      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :is-self="msg.sender.id === authStore.user?.id && msg.sender.type === 'user'"
        @reply="setReplyTo"
      />
    </div>

    <div v-if="replyTo" class="reply-preview">
      <div class="reply-content">
        回复 {{ replyTo.sender.nickname }}: {{ getMessagePreview(replyTo) }}
      </div>
      <button class="close" @click="replyTo = null">×</button>
    </div>

    <footer class="input-area">
      <div class="toolbar">
        <button class="tool-btn" @click="$refs.fileInput.click()">📎</button>
        <input type="file" ref="fileInput" hidden @change="handleFileSelect" />
      </div>
      <div class="input-wrapper">
        <textarea
          v-model="inputText"
          placeholder="输入消息..."
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="inputText += '\n'"
          rows="1"
        ></textarea>
        <button class="send-btn primary" @click="sendMessage">发送</button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useConversationStore } from '@/stores/conversation'
import { useMessageStore } from '@/stores/message'
import MessageBubble from './MessageBubble.vue'
import http, { BASE_URL } from '@/api/http'
import type { Message } from '@/api/types'

const props = defineProps<{
  conversationId: string
}>()

const authStore = useAuthStore()
const conversationStore = useConversationStore()
const messageStore = useMessageStore()

const inputText = ref('')
const replyTo = ref<Message | null>(null)
const showSearch = ref(false)
const searchQuery = ref('')
const loading = ref(false)
const messageListRef = ref<HTMLElement | null>(null)

const messages = computed(() => messageStore.getMessages(props.conversationId))

const conversationName = computed(() => {
  const conv = conversationStore.currentConversation
  if (!conv) return ''
  if (conv.type === 'group') return conv.name || '群聊'
  const member = conv.members?.find(m => m.user_id !== authStore.user?.id)
  return member?.user.nickname || '私聊'
})

watch(() => props.conversationId, async (id) => {
  if (id) {
    loading.value = true
    await messageStore.fetchMessages(id)
    loading.value = false
    scrollToBottom()
  }
}, { immediate: true })

watch(messages, () => {
  nextTick(() => {
    const el = messageListRef.value
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      scrollToBottom()
    }
  })
}, { deep: true })

function scrollToBottom() {
  nextTick(() => {
    const el = messageListRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

async function handleScroll() {
  const el = messageListRef.value
  if (!el || loading.value) return

  if (el.scrollTop < 50 && messages.value.length > 0) {
    const firstMsg = messages.value[0]
    loading.value = true
    await messageStore.fetchMessages(props.conversationId, firstMsg.created_at)
    loading.value = false
  }
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return

  try {
    await messageStore.sendMessage(
      props.conversationId,
      'text',
      { text },
      replyTo.value?.id
    )
    inputText.value = ''
    replyTo.value = null
    await messageStore.fetchMessages(props.conversationId)
    scrollToBottom()
  } catch (e: any) {
    alert(e.message || '发送失败')
  }
}

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res: any = await http.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    let type = 'file'
    let content: any = {
      url: res.url,
      name: res.name,
      size: res.size,
      mime_type: res.mime_type
    }

    if (res.mime_type?.startsWith('image/')) {
      type = 'image'
      content = { url: res.url, width: 0, height: 0, size: res.size }
    } else if (res.mime_type?.startsWith('video/')) {
      type = 'video'
      content = { url: res.url, duration: 0, size: res.size }
    }

    await messageStore.sendMessage(props.conversationId, type, content)
    await messageStore.fetchMessages(props.conversationId)
    scrollToBottom()
  } catch (e: any) {
    alert(e.message || '上传失败')
  }

  input.value = ''
}

function setReplyTo(msg: Message) {
  replyTo.value = msg
}

function getMessagePreview(msg: Message): string {
  if (msg.type === 'text') {
    return (msg.content as any).text?.slice(0, 30) || ''
  }
  return `[${msg.type}]`
}

async function searchMessages() {
  if (!searchQuery.value) return
  const results = await messageStore.searchMessages(props.conversationId, searchQuery.value)
  console.log('Search results:', results)
}
</script>

<style scoped>
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.chat-header {
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header .title {
  font-size: 16px;
  font-weight: 500;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg);
  border: none;
  cursor: pointer;
}

.search-bar {
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 12px;
}

.search-bar input {
  flex: 1;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.loading {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}

.reply-preview {
  padding: 8px 20px;
  background: #e6f7ff;
  display: flex;
  align-items: center;
  gap: 12px;
}

.reply-content {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reply-preview .close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-secondary);
}

.input-area {
  padding: 12px 20px;
  background: white;
  border-top: 1px solid var(--border);
}

.toolbar {
  margin-bottom: 8px;
}

.tool-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}

.input-wrapper {
  display: flex;
  gap: 12px;
}

.input-wrapper textarea {
  flex: 1;
  resize: none;
  padding: 10px 12px;
  min-height: 40px;
  max-height: 120px;
}

.send-btn {
  align-self: flex-end;
}
</style>
