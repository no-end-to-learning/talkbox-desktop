<template>
  <div
    class="chat-view"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- 拖拽遮罩 -->
    <div v-if="isDragging" class="drop-overlay">
      <div class="drop-hint">
        <div class="drop-icon">📁</div>
        <div class="drop-text">松开发送文件</div>
      </div>
    </div>

    <!-- 聊天头部 -->
    <header class="chat-header">
      <div class="header-left">
        <div class="avatar" :class="getAvatarColor(props.conversationId)">
          {{ conversationInitial }}
        </div>
        <div class="header-info">
          <h3 class="chat-title">{{ conversationName }}</h3>
          <span v-if="memberCount > 0" class="member-count">{{ memberCount }} 人</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="icon-btn" @click="showSearch = !showSearch" title="搜索">
          <Icon icon="lucide:search" width="24" />
        </button>
        <button v-if="isGroup" class="icon-btn" @click="showSettings = true" title="群设置">
          <Icon icon="lucide:settings" width="24" />
        </button>
      </div>
    </header>
    <!-- 拖动区域占位 -->
    <div class="header-spacer"></div>

    <!-- 搜索栏 -->
    <div v-if="showSearch" class="search-bar">
      <input v-model="searchQuery" placeholder="搜索消息..." @keyup.enter="doSearch" />
      <button class="btn primary" @click="doSearch">搜索</button>
      <button v-if="searchResults.length > 0" class="btn secondary" @click="clearSearch">清除</button>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchResults.length > 0" class="search-results">
      <div class="search-results-header">
        <span>找到 {{ searchResults.length }} 条结果</span>
      </div>
      <div class="search-results-list">
        <div v-for="msg in searchResults" :key="msg.id" class="search-result-item" @click="scrollToMessage(msg.id)">
          <div class="result-sender">{{ msg.sender.nickname }}</div>
          <div class="result-content">{{ getMessagePreview(msg) }}</div>
        </div>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef" @scroll="handleScroll">
      <div v-if="loading" class="loading">
        <span class="spinner"></span>
        <span>加载中...</span>
      </div>
      <template v-for="(msg, index) in displayMessages" :key="msg.id">
        <div v-if="shouldShowTime(index)" class="time-separator">
          <span>{{ formatTimeGroup(msg.created_at) }}</span>
        </div>
        <MessageBubble
          :id="'msg-' + msg.id"
          :message="msg"
          :show-avatar="shouldShowAvatar(index)"
          :show-name="shouldShowName(index)"
          @reply="setReplyTo"
          @viewImage="openImageViewer"
          @playVideo="openVideoPlayer"
        />
      </template>
      <div v-if="displayMessages.length === 0 && !loading" class="empty-messages">
        <p>暂无消息，发送第一条消息吧</p>
      </div>
    </div>

    <!-- 回复预览 -->
    <div v-if="replyTo" class="reply-preview">
      <div class="reply-info">
        <span class="reply-label">回复</span>
        <span class="reply-name">{{ replyTo.sender.nickname }}</span>
        <span class="reply-text">{{ getMessagePreview(replyTo) }}</span>
      </div>
      <button class="close-btn" @click="replyTo = null">
        <Icon icon="lucide:x" width="16" />
      </button>
    </div>

    <!-- 输入区域 -->
    <footer class="input-area">
      <button class="tool-btn" @click="($refs.fileInput as HTMLInputElement).click()" title="发送文件">
        <Icon icon="lucide:plus-square" width="24" />
      </button>
      <input type="file" ref="fileInput" hidden @change="handleFileSelect" />
      <div class="input-wrapper">
        <textarea
          v-model="inputText"
          :placeholder="replyTo ? '回复 ' + replyTo.sender.nickname + '...' : '输入消息...'"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="inputText += '\n'"
          rows="1"
          ref="textareaRef"
        ></textarea>
      </div>
      <button class="send-btn" :class="{ active: inputText.trim() }" @click="sendMessage" :disabled="!inputText.trim()">
        <Icon icon="lucide:send" width="24" />
      </button>
    </footer>

    <!-- 群设置弹窗 -->
    <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
      <div class="settings-panel">
        <div class="panel-header">
          <h3>群设置</h3>
          <button class="close-btn" @click="showSettings = false">
            <Icon icon="lucide:x" width="16" />
          </button>
        </div>

        <div class="panel-body">
          <!-- 群名称 -->
          <div class="section">
            <div class="section-title">群名称</div>
            <div class="input-row">
              <input v-model="groupName" placeholder="群名称" />
              <button class="btn primary" @click="updateGroupName">保存</button>
            </div>
          </div>

          <!-- 群成员 -->
          <div class="section">
            <div class="section-title">群成员 ({{ conversation?.members?.length || 0 }})</div>
            <div class="member-list">
              <div v-for="member in conversation?.members" :key="member.user_id" class="member-item">
                <div class="member-avatar" :class="getAvatarColor(member.user_id)">
                  {{ member.user.nickname?.[0] || 'U' }}
                </div>
                <div class="member-info">
                  <div class="member-name">
                    {{ member.user.nickname }}
                    <span v-if="member.role === 'owner'" class="role-badge owner">群主</span>
                    <span v-else-if="member.role === 'admin'" class="role-badge admin">管理员</span>
                  </div>
                  <div class="member-username">@{{ member.user.username }}</div>
                </div>
                <button
                  v-if="isOwner && member.user_id !== authStore.user?.id"
                  class="btn-icon danger"
                  @click="kickMember(member.user_id)"
                  title="移除"
                >
                  <Icon icon="lucide:x" width="20" />
                </button>
              </div>
            </div>
          </div>

          <!-- 添加成员 -->
          <div class="section">
            <div class="section-title">添加成员</div>
            <div class="add-list">
              <div v-for="friend in availableFriends" :key="friend.id" class="member-item">
                <div class="member-avatar" :class="getAvatarColor(friend.friend.id)">
                  {{ friend.friend.nickname?.[0] || 'U' }}
                </div>
                <div class="member-info">
                  <div class="member-name">{{ friend.friend.nickname }}</div>
                </div>
                <button class="btn primary small" @click="addMember(friend.friend.id)">添加</button>
              </div>
              <div v-if="availableFriends.length === 0" class="empty-hint">
                暂无可添加的好友
              </div>
            </div>
          </div>

          <!-- 群内 Bot -->
          <div class="section">
            <div class="section-title">群内 Bot ({{ conversation?.bots?.length || 0 }})</div>
            <div class="member-list">
              <div v-for="bot in conversation?.bots" :key="bot.id" class="member-item">
                <div class="member-avatar" :class="getAvatarColor(bot.id)">
                  {{ bot.name[0] }}
                </div>
                <div class="member-info">
                  <div class="member-name">
                    {{ bot.name }}
                    <span class="role-badge bot">Bot</span>
                  </div>
                  <div class="member-username">{{ bot.description || 'Bot' }}</div>
                </div>
                <button
                  v-if="isOwner"
                  class="btn-icon danger"
                  @click="removeBotFromGroup(bot.id)"
                  title="移除"
                >
                  <Icon icon="lucide:x" width="20" />
                </button>
              </div>
              <div v-if="!conversation?.bots?.length" class="empty-hint">
                暂无 Bot
              </div>
            </div>
          </div>

          <!-- 添加 Bot -->
          <div class="section">
            <div class="section-title">添加 Bot</div>
            <div class="add-list">
              <div v-for="bot in availableBots" :key="bot.id" class="member-item">
                <div class="member-avatar" :class="getAvatarColor(bot.id)">
                  {{ bot.name[0] }}
                </div>
                <div class="member-info">
                  <div class="member-name">{{ bot.name }}</div>
                  <div class="member-username">{{ bot.description || 'Bot' }}</div>
                </div>
                <button class="btn primary small" @click="addBotToGroup(bot.id)">添加</button>
              </div>
              <div v-if="availableBots.length === 0" class="empty-hint">
                暂无可添加的 Bot
              </div>
            </div>
          </div>

          <!-- 解散群 -->
          <div v-if="isOwner" class="section danger-section">
            <button class="btn danger" @click="dissolveGroup">解散群聊</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>

    <!-- 文件发送确认弹窗 -->
    <div v-if="pendingFile || pendingFilePath" class="modal-overlay" @click.self="cancelPendingFile">
      <div class="file-confirm-modal">
        <div class="file-preview">
          <template v-if="pendingFile">
            <img v-if="pendingFile.type === 'image'" :src="pendingFile.previewUrl" class="preview-image" />
            <video v-else-if="pendingFile.type === 'video'" :src="pendingFile.previewUrl" class="preview-video" controls />
            <div v-else class="preview-file">
              <div class="file-icon">📄</div>
              <div class="file-name">{{ pendingFile.file.name }}</div>
              <div class="file-size">{{ formatFileSize(pendingFile.file.size) }}</div>
            </div>
          </template>
          <template v-else-if="pendingFilePath">
            <div class="preview-file">
              <div class="file-icon">{{ getFileIcon(pendingFilePath) }}</div>
              <div class="file-name">{{ getFileName(pendingFilePath) }}</div>
            </div>
          </template>
        </div>
        <div class="file-confirm-actions">
          <button class="btn secondary" @click="cancelPendingFile">取消</button>
          <button class="btn primary" @click="confirmSendFile">发送</button>
        </div>
      </div>
    </div>

    <!-- 图片查看器 -->
    <Teleport to="body">
      <div v-if="viewingImage" class="image-viewer-overlay" @click="closeImageViewer">
        <div class="image-viewer-container" @click.stop>
          <img
            ref="viewerImageRef"
            :src="viewingImage"
            class="viewer-image"
            @wheel.prevent="handleImageWheel"
            @mousedown="startImageDrag"
            draggable="false"
          />
        </div>
        <div class="viewer-controls">
          <button class="viewer-btn" @click.stop="zoomIn" title="放大">
            <Icon icon="lucide:zoom-in" :width="32" :height="32" />
          </button>
          <span class="zoom-level">{{ Math.round(imageScale * 100) }}%</span>
          <button class="viewer-btn" @click.stop="zoomOut" title="缩小">
            <Icon icon="lucide:zoom-out" :width="32" :height="32" />
          </button>
          <button class="viewer-btn" @click.stop="resetZoom" title="重置">
            <Icon icon="lucide:maximize" :width="32" :height="32" />
          </button>
          <button class="viewer-btn close" @click.stop="closeImageViewer" title="关闭">
            <Icon icon="lucide:x" :width="32" :height="32" />
          </button>
        </div>
      </div>
    </Teleport>

    <!-- 视频播放器 -->
    <div v-if="playingVideo" class="video-player-overlay" @click="closeVideoPlayer">
      <div class="video-player-container" @click.stop>
        <video
          ref="videoPlayerRef"
          :src="playingVideo"
          controls
          autoplay
          class="player-video"
        ></video>
      </div>
      <button class="close-player-btn" @click.stop="closeVideoPlayer">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useConversationStore } from '@/stores/conversation'
import { useMessageStore } from '@/stores/message'
import { useFriendStore } from '@/stores/friend'
import { useBotStore } from '@/stores/bot'
import MessageBubble from './MessageBubble.vue'
import http from '@/api/http'
import type { Message } from '@/api/types'
import { Icon } from '@iconify/vue'
import { listen } from '@tauri-apps/api/event'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { readFile } from '@tauri-apps/plugin-fs'

const props = defineProps<{
  conversationId: string
}>()

const authStore = useAuthStore()
const conversationStore = useConversationStore()
const messageStore = useMessageStore()
const friendStore = useFriendStore()
const botStore = useBotStore()

const inputText = ref('')
const replyTo = ref<Message | null>(null)
const showSearch = ref(false)
const searchQuery = ref('')
const searchResults = ref<Message[]>([])
const loading = ref(false)
const messageListRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const showSettings = ref(false)
const groupName = ref('')

const toast = ref({ show: false, message: '', type: 'success' })
const noMoreMessages = ref(false)
const isDragging = ref(false)
const dragCounter = ref(0)
const pendingFile = ref<{ file: File; type: string; previewUrl: string } | null>(null)
const pendingFilePath = ref<string | null>(null)

// 图片查看器状态
const viewingImage = ref<string | null>(null)
const imageScale = ref(1)
const imageOffset = ref({ x: 0, y: 0 })
const viewerImageRef = ref<HTMLImageElement | null>(null)
let isDraggingImage = false
let dragStart = { x: 0, y: 0 }
let offsetStart = { x: 0, y: 0 }
let rafId: number | null = null

// 直接更新图片 transform（绕过 Vue 响应式，提高性能）
function updateImageTransform() {
  if (viewerImageRef.value) {
    // translate 在前，scale 在后，这样拖拽是在屏幕坐标系中进行
    viewerImageRef.value.style.transform =
      `translate(${imageOffset.value.x}px, ${imageOffset.value.y}px) scale(${imageScale.value})`
  }
}

// 视频播放器状态
const playingVideo = ref<string | null>(null)
const videoPlayerRef = ref<HTMLVideoElement | null>(null)

let unlistenDrop: UnlistenFn | null = null
let unlistenHover: UnlistenFn | null = null
let unlistenCancel: UnlistenFn | null = null

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 2000)
}

const messages = computed(() => messageStore.getMessages(props.conversationId))
const displayMessages = computed(() => searchResults.value.length > 0 ? searchResults.value : messages.value)

const conversation = computed(() => conversationStore.currentConversation)

const isGroup = computed(() => conversation.value?.type === 'group')

const isOwner = computed(() => {
  const conv = conversation.value
  if (!conv) return false
  return conv.owner_id === authStore.user?.id
})

const conversationName = computed(() => {
  const conv = conversation.value
  if (!conv) return ''
  if (conv.type === 'group') return conv.name || '群聊'
  const member = conv.members?.find(m => m.user_id !== authStore.user?.id)
  return member?.user.nickname || '私聊'
})

const conversationInitial = computed(() => {
  const conv = conversation.value
  if (!conv) return ''
  if (conv.type === 'group') return (conv.name || '群')[0]
  const member = conv.members?.find(m => m.user_id !== authStore.user?.id)
  return member?.user.nickname?.[0] || 'U'
})

const memberCount = computed(() => {
  const conv = conversation.value
  if (!conv || conv.type !== 'group') return 0
  return conv.members?.length || 0
})

const availableFriends = computed(() => {
  const conv = conversation.value
  if (!conv) return []
  const memberIds = new Set(conv.members?.map(m => m.user_id) || [])
  return friendStore.friends.filter(f => !memberIds.has(f.friend.id))
})

const availableBots = computed(() => {
  const conv = conversation.value
  if (!conv) return []
  const existingBotIds = new Set(conv.bots?.map(b => b.id) || [])
  // Only show user's own bots that are not already in the group
  return botStore.bots.filter(b => !existingBotIds.has(b.id))
})

function getAvatarColor(id?: string): string {
  if (!id) return 'color-1'
  const num = id.charCodeAt(0) % 6 + 1
  return `color-${num}`
}

onMounted(async () => {
  friendStore.fetchFriends()
  botStore.fetchBots()

  // 监听 Tauri 文件拖放事件
  unlistenHover = await listen('tauri://drag-over', () => {
    isDragging.value = true
  })

  unlistenCancel = await listen('tauri://drag-leave', () => {
    isDragging.value = false
  })

  unlistenDrop = await listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
    isDragging.value = false
    const paths = event.payload.paths
    if (paths && paths.length > 0) {
      pendingFilePath.value = paths[0]
    }
  })
})

onUnmounted(() => {
  unlistenHover?.()
  unlistenCancel?.()
  unlistenDrop?.()
})

watch(() => props.conversationId, async (id) => {
  if (id) {
    loading.value = true
    noMoreMessages.value = false
    conversationStore.setCurrentConversation(id)
    await conversationStore.fetchConversation(id)
    await messageStore.fetchMessages(id)
    loading.value = false
    groupName.value = conversation.value?.name || ''
    searchResults.value = []
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

watch(showSettings, async (val) => {
  if (val) {
    // 重新获取会话信息以获取最新的 bots 列表
    await conversationStore.fetchConversation(props.conversationId)
    groupName.value = conversation.value?.name || ''
  }
})

function scrollToBottom() {
  nextTick(() => {
    const el = messageListRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

function scrollToMessage(msgId: string) {
  const el = document.getElementById('msg-' + msgId)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('highlight')
    setTimeout(() => el.classList.remove('highlight'), 2000)
  }
}

async function handleScroll() {
  const el = messageListRef.value
  if (!el || loading.value || noMoreMessages.value) return

  if (el.scrollTop < 50 && messages.value.length > 0) {
    const firstMsg = messages.value[0]
    loading.value = true
    const result = await messageStore.fetchMessages(props.conversationId, firstMsg.created_at)
    loading.value = false

    // 如果返回空数组，说明没有更多历史消息
    if (!result || result.length === 0) {
      noMoreMessages.value = true
    }
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
    textareaRef.value?.focus()
  } catch (e: any) {
    showToast(e.message || '发送失败', 'error')
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
    showToast(e.message || '上传失败', 'error')
  }

  input.value = ''
}

function setReplyTo(msg: Message) {
  replyTo.value = msg
  textareaRef.value?.focus()
}

function getMessagePreview(msg: Message): string {
  if (msg.type === 'text') {
    return (msg.content as any).text?.slice(0, 30) || ''
  }
  return `[${msg.type}]`
}

function shouldShowAvatar(index: number): boolean {
  if (index === 0) return true
  const list = displayMessages.value
  const currentMsg = list[index]
  const prevMsg = list[index - 1]
  return currentMsg.sender.id !== prevMsg.sender.id
}

function shouldShowName(index: number): boolean {
  return shouldShowAvatar(index)
}

// 判断是否显示时间分隔符（5分钟间隔）
function shouldShowTime(index: number): boolean {
  const list = displayMessages.value
  if (index === 0) return true

  const currentMsg = list[index]
  const prevMsg = list[index - 1]
  const currentTime = new Date(currentMsg.created_at).getTime()
  const prevTime = new Date(prevMsg.created_at).getTime()

  // 超过5分钟显示时间
  return currentTime - prevTime > 5 * 60 * 1000
}

// 格式化时间分组显示
function formatTimeGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  if (msgDate.getTime() === today.getTime()) {
    return timeStr
  } else if (msgDate.getTime() === yesterday.getTime()) {
    return `昨天 ${timeStr}`
  } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${days[date.getDay()]} ${timeStr}`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + timeStr
  }
}

async function doSearch() {
  if (!searchQuery.value.trim()) return
  try {
    searchResults.value = await messageStore.searchMessages(props.conversationId, searchQuery.value)
    if (searchResults.value.length === 0) {
      showToast('未找到匹配的消息')
    }
  } catch (e: any) {
    showToast(e.message || '搜索失败', 'error')
  }
}

function clearSearch() {
  searchResults.value = []
  searchQuery.value = ''
}

async function updateGroupName() {
  if (!groupName.value.trim()) return
  try {
    await conversationStore.updateGroup(props.conversationId, { name: groupName.value })
    showToast('群名称已更新')
  } catch (e: any) {
    showToast(e.message || '更新失败', 'error')
  }
}

async function addMember(userId: string) {
  try {
    await conversationStore.addMembers(props.conversationId, [userId])
    showToast('已添加成员')
  } catch (e: any) {
    showToast(e.message || '添加失败', 'error')
  }
}

async function kickMember(userId: string) {
  try {
    await conversationStore.removeMember(props.conversationId, userId)
    showToast('已移除成员')
  } catch (e: any) {
    console.error('Kick member error:', e)
    showToast(e.message || '移除失败', 'error')
  }
}

async function addBotToGroup(botId: string) {
  try {
    await conversationStore.addBot(props.conversationId, botId)
    showToast('已添加 Bot')
    // 刷新会话信息
    await conversationStore.fetchConversation(props.conversationId)
  } catch (e: any) {
    console.error('Add bot error:', e)
    showToast(e.message || '添加失败', 'error')
  }
}

async function removeBotFromGroup(botId: string) {
  try {
    await conversationStore.removeBot(props.conversationId, botId)
    showToast('已移除 Bot')
    // 刷新会话信息
    await conversationStore.fetchConversation(props.conversationId)
  } catch (e: any) {
    console.error('Remove bot error:', e)
    showToast(e.message || '移除失败', 'error')
  }
}

async function dissolveGroup() {
  try {
    await conversationStore.dissolveGroup(props.conversationId)
    showSettings.value = false
    showToast('群聊已解散')
  } catch (e: any) {
    console.error('Dissolve group error:', e)
    showToast(e.message || '解散失败', 'error')
  }
}

// 拖拽相关
function onDragEnter(e: DragEvent) {
  e.preventDefault()
  dragCounter.value++
  if (e.dataTransfer?.types.includes('Files')) {
    isDragging.value = true
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragging.value = false
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  dragCounter.value = 0

  const file = e.dataTransfer?.files?.[0]
  if (!file) return

  const type = getFileType(file)
  const previewUrl = URL.createObjectURL(file)
  pendingFile.value = { file, type, previewUrl }
}

function getFileType(file: File): string {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'file'
}

function getFileTypeLabel(type: string): string {
  switch (type) {
    case 'image': return '图片'
    case 'video': return '视频'
    default: return '文件'
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileName(path: string): string {
  return path.split('/').pop() || path.split('\\').pop() || path
}

function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return '🖼️'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return '🎬'
  if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) return '🎵'
  if (['pdf'].includes(ext)) return '📕'
  if (['doc', 'docx'].includes(ext)) return '📘'
  if (['xls', 'xlsx'].includes(ext)) return '📗'
  if (['zip', 'rar', '7z'].includes(ext)) return '📦'
  return '📄'
}

function getFileTypeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video'
  return 'file'
}

function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
    mp3: 'audio/mpeg', wav: 'audio/wav', pdf: 'application/pdf',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip', rar: 'application/x-rar-compressed'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

function cancelPendingFile() {
  if (pendingFile.value?.previewUrl) {
    URL.revokeObjectURL(pendingFile.value.previewUrl)
  }
  pendingFile.value = null
  pendingFilePath.value = null
}

async function confirmSendFile() {
  try {
    let formData: FormData
    let type: string

    if (pendingFile.value) {
      // 浏览器拖放的 File 对象
      const { file, type: fileType } = pendingFile.value
      formData = new FormData()
      formData.append('file', file)
      type = fileType
    } else if (pendingFilePath.value) {
      // Tauri 拖放的文件路径
      const path = pendingFilePath.value
      const fileName = getFileName(path)
      type = getFileTypeFromPath(path)

      // 读取文件内容
      const fileData = await readFile(path)
      const blob = new Blob([fileData], { type: getMimeType(path) })
      const file = new File([blob], fileName, { type: getMimeType(path) })

      formData = new FormData()
      formData.append('file', file)
    } else {
      return
    }

    const res: any = await http.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    let content: any = {
      url: res.url,
      name: res.name,
      size: res.size,
      mime_type: res.mime_type
    }

    if (type === 'image') {
      content = { url: res.url, width: 0, height: 0, size: res.size }
    } else if (type === 'video') {
      content = { url: res.url, duration: 0, size: res.size }
    }

    await messageStore.sendMessage(props.conversationId, type, content)
    await messageStore.fetchMessages(props.conversationId)
    scrollToBottom()
    showToast('发送成功')
  } catch (e: any) {
    showToast(e.message || '发送失败', 'error')
  } finally {
    cancelPendingFile()
  }
}

// 图片查看器功能
function openImageViewer(url: string) {
  viewingImage.value = url
  imageScale.value = 1
  imageOffset.value = { x: 0, y: 0 }
  document.addEventListener('mousemove', handleImageDrag)
  document.addEventListener('mouseup', stopImageDrag)
  // 等待 DOM 更新后设置初始 transform
  nextTick(() => updateImageTransform())
}

function closeImageViewer() {
  viewingImage.value = null
  document.removeEventListener('mousemove', handleImageDrag)
  document.removeEventListener('mouseup', stopImageDrag)
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

function zoomIn() {
  imageScale.value = Math.min(imageScale.value * 1.25, 5)
  updateImageTransform()
}

function zoomOut() {
  imageScale.value = Math.max(imageScale.value / 1.25, 0.25)
  updateImageTransform()
}

function resetZoom() {
  imageScale.value = 1
  imageOffset.value = { x: 0, y: 0 }
  updateImageTransform()
}

function handleImageWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  imageScale.value = Math.max(0.25, Math.min(5, imageScale.value + delta))
  // 直接更新 DOM，不等待 Vue 响应式
  updateImageTransform()
}

function startImageDrag(e: MouseEvent) {
  isDraggingImage = true
  dragStart = { x: e.clientX, y: e.clientY }
  offsetStart = { ...imageOffset.value }
}

function handleImageDrag(e: MouseEvent) {
  if (!isDraggingImage) return

  // 使用 requestAnimationFrame 节流
  if (rafId) return

  rafId = requestAnimationFrame(() => {
    // 直接使用屏幕坐标差值，因为 translate 在 scale 之前应用
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    imageOffset.value = {
      x: offsetStart.x + dx,
      y: offsetStart.y + dy
    }
    updateImageTransform()
    rafId = null
  })
}

function stopImageDrag() {
  isDraggingImage = false
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// 视频播放器功能
function openVideoPlayer(url: string) {
  playingVideo.value = url
}

function closeVideoPlayer() {
  if (videoPlayerRef.value) {
    videoPlayerRef.value.pause()
  }
  playingVideo.value = null
}
</script>

<style scoped>
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-white);
  position: relative;
}

/* 头部 */
.chat-header {
  padding: 0 20px;
  padding-top: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-white);
}

.header-spacer {
  height: 20px;
  background: var(--bg-white);
  border-bottom: 1px solid var(--border-light);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-info {
  display: flex;
  flex-direction: column;
}

.chat-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.member-count {
  font-size: 12px;
  color: var(--text-tertiary);
}

.header-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--primary);
}

/* 搜索栏 */
.search-bar {
  padding: 12px 20px;
  background: var(--bg-main);
  display: flex;
  gap: 12px;
  border-bottom: 1px solid var(--border-light);
}

.search-bar input {
  flex: 1;
}

/* 搜索结果 */
.search-results {
  background: var(--bg-white);
  border-bottom: 1px solid var(--border-light);
  max-height: 200px;
  overflow-y: auto;
}

.search-results-header {
  padding: 8px 20px;
  font-size: 12px;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border-light);
}

.search-result-item {
  padding: 10px 20px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-light);
}

.search-result-item:hover {
  background: var(--bg-hover);
}

.result-sender {
  font-size: 12px;
  color: var(--primary);
  font-weight: 500;
  margin-bottom: 2px;
}

.result-content {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 消息列表 */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
}

.time-separator {
  display: flex;
  justify-content: center;
  margin: 16px 0;
}

.time-separator span {
  font-size: 12px;
  color: #999;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px 12px;
  border-radius: 4px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: var(--text-tertiary);
  font-size: 13px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  font-size: 14px;
}

/* 回复预览 */
.reply-preview {
  padding: 10px 20px;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.reply-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  min-width: 0;
}

.reply-label {
  color: var(--primary);
  font-weight: 500;
}

.reply-name {
  color: var(--text-primary);
  font-weight: 500;
}

.reply-text {
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

/* 输入区域 */
.input-area {
  padding: 12px 20px;
  background: var(--bg-white);
  border-top: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-btn {
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-hover);
  color: var(--text-secondary);
  transition: all 0.2s;
  flex-shrink: 0;
}

.tool-btn:hover {
  background: var(--bg-active);
  color: var(--primary);
}

.input-wrapper {
  flex: 1;
  min-width: 0;
}

.input-wrapper textarea {
  width: 100%;
  resize: none;
  padding: 10px 14px;
  min-height: 40px;
  max-height: 120px;
  border-radius: var(--radius-md);
  line-height: 1.5;
}

.send-btn {
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-hover);
  color: var(--text-tertiary);
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn.active {
  background: var(--primary);
  color: white;
}

.send-btn.active:hover {
  background: var(--primary-hover);
}

/* 群设置弹窗 */
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

.settings-panel {
  background: var(--bg-white);
  border-radius: 12px;
  width: 420px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.panel-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.input-row {
  display: flex;
  gap: 8px;
}

.input-row input {
  flex: 1;
}

.member-list, .add-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-light);
  border-radius: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-light);
}

.member-item:last-child {
  border-bottom: none;
}

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 14px;
  color: white;
  flex-shrink: 0;
}

.member-avatar.color-1 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.member-avatar.color-2 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.member-avatar.color-3 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.member-avatar.color-4 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.member-avatar.color-5 { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
.member-avatar.color-6 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.member-username {
  font-size: 12px;
  color: var(--text-tertiary);
}

.role-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.role-badge.owner {
  background: #fff7e6;
  color: #fa8c16;
}

.role-badge.admin {
  background: #e6f7ff;
  color: #1890ff;
}

.role-badge.bot {
  background: #f6ffed;
  color: #52c41a;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.btn.small {
  padding: 4px 12px;
  font-size: 12px;
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

.btn.danger {
  background: var(--error);
  color: white;
}

.btn.danger:hover {
  background: #ff5f57;
}

.btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.btn-icon:hover {
  background: var(--bg-hover);
}

.btn-icon.danger {
  color: var(--error);
}

.btn-icon.danger:hover {
  background: #fff1f0;
}

.empty-hint {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary);
}

.danger-section {
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

/* Toast */
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

/* 消息高亮 */
:deep(.highlight) {
  animation: highlight 2s ease;
}

@keyframes highlight {
  0%, 30% { background: rgba(51, 112, 255, 0.15); }
  100% { background: transparent; }
}

/* 拖拽遮罩 */
.drop-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(51, 112, 255, 0.1);
  border: 3px dashed var(--primary);
  border-radius: 8px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drop-hint {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
}

.drop-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.drop-text {
  font-size: 16px;
  color: var(--primary);
  font-weight: 500;
}

/* 文件确认弹窗 */
.file-confirm-modal {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  max-width: 400px;
  width: 90%;
  box-shadow: var(--shadow-lg);
}

.file-preview {
  padding: 20px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
}

.preview-video {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
}

.preview-file {
  text-align: center;
  padding: 20px;
}

.preview-file .file-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.preview-file .file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  word-break: break-all;
}

.preview-file .file-size {
  font-size: 12px;
  color: var(--text-tertiary);
}

.file-confirm-actions {
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--border-light);
}

/* 视频播放器 */
.video-player-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-player-container {
  max-width: 90vw;
  max-height: 90vh;
}

.player-video {
  max-width: 90vw;
  max-height: 85vh;
  border-radius: 8px;
}

.close-player-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.close-player-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>

<!-- 图片查看器样式需要全局，因为使用了 Teleport -->
<style>
.image-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-viewer-container {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

.image-viewer-container:active {
  cursor: grabbing;
}

.viewer-image {
  max-width: 95vw;
  max-height: 90vh;
  object-fit: contain;
  user-select: none;
  will-change: transform;
  transform-origin: center center;
}

.viewer-controls {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.6);
  padding: 10px 20px;
  border-radius: 30px;
}

.viewer-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.viewer-btn svg {
  width: 20px !important;
  height: 20px !important;
  min-width: 20px;
  min-height: 20px;
}

.viewer-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.viewer-btn.close {
  background: rgba(255, 100, 100, 0.5);
}

.viewer-btn.close:hover {
  background: rgba(255, 100, 100, 0.7);
}

.zoom-level {
  color: white;
  font-size: 14px;
  min-width: 50px;
  text-align: center;
}
</style>
