import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '@/api/http'
import type { Conversation } from '@/api/types'

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversation[]>([])
  const currentConversationId = ref<string>('')
  const loading = ref(false)

  const currentConversation = computed(() => {
    return conversations.value.find(c => c.id === currentConversationId.value)
  })

  async function fetchConversations() {
    loading.value = true
    try {
      const res: any = await http.get('/api/conversations')
      conversations.value = res
    } finally {
      loading.value = false
    }
  }

  async function fetchConversation(id: string) {
    const res: any = await http.get(`/api/conversations/${id}`)
    const index = conversations.value.findIndex(c => c.id === id)
    if (index >= 0) {
      conversations.value[index] = res
    }
    return res
  }

  async function createGroup(name: string, memberIds: string[]) {
    const res: any = await http.post('/api/conversations', { name, member_ids: memberIds })
    await fetchConversations()
    return res
  }

  async function startPrivateChat(userId: string) {
    const res: any = await http.post('/api/conversations/private', { user_id: userId })
    await fetchConversations()
    return res.conversation_id
  }

  async function addMembers(conversationId: string, userIds: string[]) {
    await http.post(`/api/conversations/${conversationId}/members`, { user_ids: userIds })
    await fetchConversation(conversationId)
  }

  async function removeMember(conversationId: string, userId: string) {
    await http.delete(`/api/conversations/${conversationId}/members/${userId}`)
    await fetchConversation(conversationId)
  }

  async function addBot(conversationId: string, botId: string) {
    await http.post(`/api/conversations/${conversationId}/bots/${botId}`)
  }

  async function removeBot(conversationId: string, botId: string) {
    await http.delete(`/api/conversations/${conversationId}/bots/${botId}`)
  }

  function setCurrentConversation(id: string) {
    currentConversationId.value = id
  }

  function updateConversationTime(conversationId: string) {
    const index = conversations.value.findIndex(c => c.id === conversationId)
    if (index > 0) {
      const [conv] = conversations.value.splice(index, 1)
      conv.updated_at = new Date().toISOString()
      conversations.value.unshift(conv)
    }
  }

  return {
    conversations,
    currentConversationId,
    currentConversation,
    loading,
    fetchConversations,
    fetchConversation,
    createGroup,
    startPrivateChat,
    addMembers,
    removeMember,
    addBot,
    removeBot,
    setCurrentConversation,
    updateConversationTime
  }
})
