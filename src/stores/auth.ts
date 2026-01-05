import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/api/http'
import { wsService } from '@/api/websocket'
import type { User } from '@/api/types'

// 从 localStorage 恢复用户信息
function getSavedUser(): User | null {
  try {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const user = ref<User | null>(getSavedUser())

  async function login(username: string, password: string) {
    const res: any = await http.post('/api/auth/login', { username, password })
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    wsService.connect(res.token)
    return res
  }

  async function register(username: string, password: string, nickname?: string) {
    const res: any = await http.post('/api/auth/register', { username, password, nickname })
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    wsService.connect(res.token)
    return res
  }

  async function fetchCurrentUser() {
    try {
      const res: any = await http.get('/api/users/me')
      user.value = res
      localStorage.setItem('user', JSON.stringify(res))
      wsService.connect(token.value)
      return res
    } catch (e: any) {
      // 只有 401 未授权时才清除登录状态
      if (e?.response?.status === 401) {
        logout()
      }
      throw e
    }
  }

  async function updateProfile(data: { nickname?: string; avatar?: string }) {
    const res: any = await http.put('/api/users/me', data)
    user.value = res
    localStorage.setItem('user', JSON.stringify(res))
    return res
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    wsService.disconnect()
  }

  // 初始化时如果有 token，连接 WebSocket
  function init() {
    if (token.value && user.value) {
      wsService.connect(token.value)
    }
  }

  return {
    token,
    user,
    login,
    register,
    fetchCurrentUser,
    updateProfile,
    logout,
    init
  }
})
