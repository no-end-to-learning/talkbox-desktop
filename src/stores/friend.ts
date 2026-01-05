import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/api/http'
import type { User } from '@/api/types'

export const useFriendStore = defineStore('friend', () => {
  const friends = ref<User[]>([])
  const loading = ref(false)

  async function fetchFriends() {
    loading.value = true
    try {
      const res: any = await http.get('/api/users')
      friends.value = res
    } finally {
      loading.value = false
    }
  }

  return {
    friends,
    loading,
    fetchFriends
  }
})
