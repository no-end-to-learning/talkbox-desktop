import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/api/http'
import { wsService } from '@/api/websocket'
import { useConversationStore } from './conversation'
import type { Message } from '@/api/types'

export const useMessageStore = defineStore('message', () => {
  const messages = ref<Map<string, Message[]>>(new Map())
  const loading = ref(false)

  function getMessages(conversationId: string): Message[] {
    return messages.value.get(conversationId) || []
  }

  async function fetchMessages(conversationId: string, before?: string) {
    loading.value = true
    try {
      const params: any = { limit: 50 }
      if (before) params.before = before

      const res: any = await http.get(`/api/conversations/${conversationId}/messages`, { params })
      const list = (res as Message[]).reverse()

      if (before) {
        const existing = messages.value.get(conversationId) || []
        messages.value.set(conversationId, [...list, ...existing])
      } else {
        messages.value.set(conversationId, list)
      }

      return list
    } finally {
      loading.value = false
    }
  }

  async function sendMessage(conversationId: string, type: string, content: any, replyToId?: string) {
    const res: any = await http.post(`/api/conversations/${conversationId}/messages`, {
      type,
      content,
      reply_to_id: replyToId
    })
    return res
  }

  async function searchMessages(conversationId: string, query: string) {
    const res: any = await http.get(`/api/conversations/${conversationId}/messages/search`, {
      params: { q: query }
    })
    return res as Message[]
  }

  function addMessage(message: Message) {
    const conversationId = message.conversation_id
    const list = messages.value.get(conversationId) || []

    if (!list.find(m => m.id === message.id)) {
      list.push(message)
      messages.value.set(conversationId, list)
    }

    const conversationStore = useConversationStore()
    conversationStore.updateConversationTime(conversationId)
  }

  function initWebSocket() {
    wsService.onMessage = (msg: Message) => {
      addMessage(msg)
    }

    wsService.onMentioned = (data: any) => {
      console.log('You were mentioned:', data)
    }
  }

  return {
    messages,
    loading,
    getMessages,
    fetchMessages,
    sendMessage,
    searchMessages,
    addMessage,
    initWebSocket
  }
})
