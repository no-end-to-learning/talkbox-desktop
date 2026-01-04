import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/api/http'
import { wsService } from '@/api/websocket'
import type { User } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const user = ref<User | null>(null)

  async function login(username: string, password: string) {
    const res: any = await http.post('/api/auth/login', { username, password })
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
    wsService.connect(res.token)
    return res
  }

  async function register(username: string, password: string, nickname?: string) {
    const res: any = await http.post('/api/auth/register', { username, password, nickname })
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
    wsService.connect(res.token)
    return res
  }

  async function fetchCurrentUser() {
    try {
      const res: any = await http.get('/api/users/me')
      user.value = res
      wsService.connect(token.value)
      return res
    } catch (e) {
      logout()
      throw e
    }
  }

  async function updateProfile(data: { nickname?: string; avatar?: string }) {
    const res: any = await http.put('/api/users/me', data)
    user.value = res
    return res
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    wsService.disconnect()
  }

  return {
    token,
    user,
    login,
    register,
    fetchCurrentUser,
    updateProfile,
    logout
  }
})
