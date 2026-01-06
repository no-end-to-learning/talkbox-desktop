<template>
  <div class="message-bubble" :class="{ 'no-avatar': !showAvatar }">
    <div v-if="showAvatar" class="avatar" :class="getAvatarColor(message.sender.id)">
      {{ message.sender.nickname?.[0] || 'U' }}
    </div>
    <div v-else class="avatar-placeholder"></div>

    <div class="bubble-content">
      <div v-if="showName" class="sender-name">
        {{ message.sender.nickname }}
        <span v-if="message.sender.type === 'bot'" class="bot-badge">Bot</span>
      </div>

      <div v-if="message.reply_to" class="reply-ref" @click="$emit('scrollTo', message.reply_to.id)">
        <div class="reply-bar"></div>
        <div class="reply-body">
          <span class="reply-name">{{ message.reply_to.sender_name }}</span>
          <span class="reply-text">{{ getReplyPreview(message.reply_to) }}</span>
        </div>
      </div>

      <div class="bubble" :class="message.type">
        <template v-if="message.type === 'text'">
          <div class="text-content" v-html="formatText((message.content as any).text)"></div>
        </template>

        <template v-else-if="message.type === 'image'">
          <img
            :src="getFileUrl((message.content as any).url)"
            class="image-content"
            @click="$emit('viewImage', getFileUrl((message.content as any).url))"
          />
        </template>

        <template v-else-if="message.type === 'video'">
          <div class="video-thumbnail" @click="$emit('playVideo', getFileUrl((message.content as any).url))">
            <video
              :src="getFileUrl((message.content as any).url)"
              class="video-content"
              preload="metadata"
            ></video>
            <div class="play-overlay">
              <div class="play-btn">▶</div>
            </div>
          </div>
        </template>

        <template v-else-if="message.type === 'file'">
          <div class="file-content" @click="downloadFile((message.content as any).url, (message.content as any).name)">
            <div class="file-icon">
              <Icon icon="lucide:file-text" width="20" />
            </div>
            <div class="file-info">
              <div class="file-name">{{ (message.content as any).name }}</div>
              <div class="file-size">{{ formatSize((message.content as any).size) }}</div>
            </div>
            <div class="file-download">
              <Icon icon="lucide:download" width="16" />
            </div>
          </div>
        </template>

        <template v-else-if="message.type === 'card'">
          <div
            class="card-content"
            :style="{ borderLeftColor: (message.content as any).color || '#3370ff' }"
            @click="openUrl((message.content as any).url)"
          >
            <div class="card-title">{{ (message.content as any).title }}</div>
            <div v-if="(message.content as any).content" class="card-body">
              {{ (message.content as any).content }}
            </div>
            <div v-if="(message.content as any).note" class="card-note">
              {{ (message.content as any).note }}
            </div>
          </div>
        </template>
      </div>

      <div class="message-meta">
        <button class="reply-btn" @click="$emit('reply', message)">
          <Icon icon="lucide:reply" width="14" />
          回复
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '@/api/types'
import { getBaseUrl } from '@/api/http'
import { Icon } from '@iconify/vue'

defineProps<{
  message: Message
  showAvatar: boolean
  showName: boolean
}>()

defineEmits(['reply', 'scrollTo', 'viewImage', 'playVideo'])

function getAvatarColor(id?: string): string {
  if (!id) return 'color-1'
  const num = id.charCodeAt(0) % 6 + 1
  return `color-${num}`
}

function getFileUrl(url: string): string {
  if (url.startsWith('http')) return url
  return getBaseUrl() + url
}

function formatText(text: string): string {
  if (!text) return ''
  // Escape HTML
  text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Convert URLs to links
  text = text.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener">$1</a>'
  )
  // Convert newlines
  text = text.replace(/\n/g, '<br>')
  return text
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getReplyPreview(reply: any): string {
  if (reply.type === 'text') {
    return reply.content?.text?.slice(0, 20) || ''
  }
  return `[${reply.type}]`
}

function downloadFile(url: string, name: string) {
  const a = document.createElement('a')
  a.href = getFileUrl(url)
  a.download = name
  a.click()
}

function openUrl(url?: string) {
  if (url) {
    window.open(url, '_blank')
  }
}
</script>

<style scoped>
.message-bubble {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  max-width: 70%;
}

.message-bubble.no-avatar {
  margin-bottom: 4px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 13px;
  flex-shrink: 0;
  color: white;
}

.avatar-placeholder {
  width: 36px;
  flex-shrink: 0;
}

.avatar.color-1 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.avatar.color-2 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.avatar.color-3 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.avatar.color-4 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.avatar.color-5 { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
.avatar.color-6 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

.bubble-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sender-name {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.bot-badge {
  background: var(--primary);
  color: white;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 500;
}

.reply-ref {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 6px;
  cursor: pointer;
  max-width: 280px;
}

.reply-bar {
  width: 3px;
  background: var(--primary);
  border-radius: 2px;
  flex-shrink: 0;
}

.reply-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 4px 0;
}

.reply-name {
  font-size: 12px;
  color: var(--primary);
  font-weight: 500;
}

.reply-text {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bubble {
  background: var(--bg-white);
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  word-break: break-word;
}

.bubble.image,
.bubble.video {
  padding: 4px;
  background: transparent;
  box-shadow: none;
}

.text-content {
  line-height: 1.6;
  font-size: 14px;
}

.text-content a {
  color: var(--primary);
}

.image-content {
  max-width: 280px;
  max-height: 200px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: block;
}

.video-content {
  max-width: 280px;
  max-height: 200px;
  border-radius: var(--radius-md);
  display: block;
}

.video-thumbnail {
  position: relative;
  cursor: pointer;
  display: inline-block;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--radius-md);
  transition: background 0.2s;
}

.video-thumbnail:hover .play-overlay {
  background: rgba(0, 0, 0, 0.4);
}

.play-btn {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #333;
  padding-left: 4px;
}

.file-content {
  display: flex;
  gap: 12px;
  align-items: center;
  cursor: pointer;
  min-width: 220px;
  padding: 4px 0;
}

.file-icon {
  width: 40px;
  height: 40px;
  background: var(--bg-main);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--primary);
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.file-download {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.card-content {
  border-left: 4px solid;
  padding-left: 12px;
  cursor: pointer;
  min-width: 200px;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.card-body {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  line-height: 1.5;
}

.card-note {
  font-size: 12px;
  color: var(--text-tertiary);
}

.message-meta {
  display: flex;
  align-items: center;
  margin-top: 4px;
}

.reply-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
  background: none;
  border: none;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.message-bubble:hover .reply-btn {
  opacity: 1;
}

.reply-btn:hover {
  color: var(--primary);
  background: var(--bg-hover);
}
</style>
