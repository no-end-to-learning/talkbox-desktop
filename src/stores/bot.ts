import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/api/http'
import type { Bot } from '@/api/types'

export const useBotStore = defineStore('bot', () => {
  const bots = ref<Bot[]>([])
  const loading = ref(false)

  async function fetchBots() {
    loading.value = true
    try {
      const res: any = await http.get('/api/bots')
      bots.value = res
    } finally {
      loading.value = false
    }
  }

  async function createBot(data: { name: string; description?: string; avatar?: string }) {
    const res: any = await http.post('/api/bots', data)
    bots.value.unshift(res)
    return res
  }

  async function updateBot(id: string, data: { name?: string; description?: string; avatar?: string }) {
    const res: any = await http.put(`/api/bots/${id}`, data)
    const index = bots.value.findIndex(b => b.id === id)
    if (index >= 0) {
      bots.value[index] = res
    }
    return res
  }

  async function deleteBot(id: string) {
    await http.delete(`/api/bots/${id}`)
    bots.value = bots.value.filter(b => b.id !== id)
  }

  async function regenerateToken(id: string) {
    const res: any = await http.post(`/api/bots/${id}/token`)
    const bot = bots.value.find(b => b.id === id)
    if (bot) {
      bot.token = res.token
    }
    return res.token
  }

  return {
    bots,
    loading,
    fetchBots,
    createBot,
    updateBot,
    deleteBot,
    regenerateToken
  }
})
