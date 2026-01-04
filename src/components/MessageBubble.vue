<template>
  <div class="message-bubble" :class="{ self: isSelf }">
    <div v-if="!isSelf" class="avatar">{{ message.sender.nickname?.[0] || 'U' }}</div>

    <div class="bubble-content">
      <div v-if="!isSelf" class="sender-name">
        {{ message.sender.nickname }}
        <span v-if="message.sender.type === 'bot'" class="bot-badge">Bot</span>
      </div>

      <div v-if="message.reply_to" class="reply-ref" @click="$emit('scrollTo', message.reply_to.id)">
        <span class="reply-name">{{ message.reply_to.sender_name }}</span>
        <span class="reply-text">{{ getReplyPreview(message.reply_to) }}</span>
      </div>

      <div class="bubble" :class="message.type">
        <template v-if="message.type === 'text'">
          <div class="text-content" v-html="formatText((message.content as any).text)"></div>
        </template>

        <template v-else-if="message.type === 'image'">
          <img
            :src="getFileUrl((message.content as any).url)"
            class="image-content"
            @click="openImage((message.content as any).url)"
          />
        </template>

        <template v-else-if="message.type === 'video'">
          <video
            :src="getFileUrl((message.content as any).url)"
            controls
            class="video-content"
          ></video>
        </template>

        <template v-else-if="message.type === 'file'">
          <div class="file-content" @click="downloadFile((message.content as any).url, (message.content as any).name)">
            <div class="file-icon">📄</div>
            <div class="file-info">
              <div class="file-name">{{ (message.content as any).name }}</div>
              <div class="file-size">{{ formatSize((message.content as any).size) }}</div>
            </div>
          </div>
        </template>

        <template v-else-if="message.type === 'card'">
          <div
            class="card-content"
            :style="{ borderLeftColor: (message.content as any).color || '#1890ff' }"
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
        <span class="time">{{ formatTime(message.created_at) }}</span>
        <button class="reply-btn" @click="$emit('reply', message)">回复</button>
      </div>
    </div>

    <div v-if="isSelf" class="avatar">{{ message.sender.nickname?.[0] || 'U' }}</div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '@/api/types'
import { BASE_URL } from '@/api/http'

defineProps<{
  message: Message
  isSelf: boolean
}>()

defineEmits(['reply', 'scrollTo'])

function getFileUrl(url: string): string {
  if (url.startsWith('http')) return url
  return BASE_URL + url
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

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
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

function openImage(url: string) {
  window.open(getFileUrl(url), '_blank')
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
  gap: 12px;
  margin-bottom: 16px;
  max-width: 70%;
}

.message-bubble.self {
  margin-left: auto;
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.bubble-content {
  display: flex;
  flex-direction: column;
}

.sender-name {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.bot-badge {
  background: var(--primary);
  color: white;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  margin-left: 4px;
}

.reply-ref {
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.04);
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  cursor: pointer;
}

.reply-ref:hover {
  background: rgba(0, 0, 0, 0.08);
}

.bubble {
  background: white;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.self .bubble {
  background: var(--primary);
  color: white;
}

.self .bubble a {
  color: white;
}

.text-content {
  word-break: break-word;
  line-height: 1.5;
}

.text-content a {
  color: var(--primary);
}

.image-content {
  max-width: 300px;
  max-height: 200px;
  border-radius: 4px;
  cursor: pointer;
}

.video-content {
  max-width: 300px;
  max-height: 200px;
  border-radius: 4px;
}

.file-content {
  display: flex;
  gap: 12px;
  align-items: center;
  cursor: pointer;
  min-width: 200px;
}

.file-icon {
  font-size: 32px;
}

.file-name {
  font-weight: 500;
  margin-bottom: 2px;
}

.file-size {
  font-size: 12px;
  color: var(--text-secondary);
}

.self .file-size {
  color: rgba(255, 255, 255, 0.8);
}

.card-content {
  border-left: 4px solid;
  padding-left: 12px;
  cursor: pointer;
  min-width: 200px;
}

.card-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.card-body {
  font-size: 13px;
  margin-bottom: 4px;
  color: var(--text-secondary);
}

.self .card-body {
  color: rgba(255, 255, 255, 0.9);
}

.card-note {
  font-size: 12px;
  color: var(--text-secondary);
}

.self .card-note {
  color: rgba(255, 255, 255, 0.7);
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.time {
  font-size: 11px;
  color: var(--text-secondary);
}

.reply-btn {
  font-size: 11px;
  color: var(--text-secondary);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-bubble:hover .reply-btn {
  opacity: 1;
}

.reply-btn:hover {
  color: var(--primary);
}
</style>
