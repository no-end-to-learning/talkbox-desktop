import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/api/http'
import type { Friend, User } from '@/api/types'

export const useFriendStore = defineStore('friend', () => {
  const friends = ref<Friend[]>([])
  const requests = ref<Friend[]>([])
  const loading = ref(false)

  async function fetchFriends() {
    loading.value = true
    try {
      const res: any = await http.get('/api/friends')
      friends.value = res
    } finally {
      loading.value = false
    }
  }

  async function fetchRequests() {
    const res: any = await http.get('/api/friends/requests')
    requests.value = res
  }

  async function sendRequest(userId: string) {
    await http.post('/api/friends/request', { user_id: userId })
  }

  async function acceptRequest(userId: string) {
    await http.post(`/api/friends/accept/${userId}`)
    await fetchFriends()
    await fetchRequests()
  }

  async function deleteFriend(userId: string) {
    await http.delete(`/api/friends/${userId}`)
    friends.value = friends.value.filter(f => f.friend_id !== userId)
  }

  async function searchUsers(query: string): Promise<User[]> {
    const res: any = await http.get('/api/users/search', { params: { q: query } })
    return res
  }

  return {
    friends,
    requests,
    loading,
    fetchFriends,
    fetchRequests,
    sendRequest,
    acceptRequest,
    deleteFriend,
    searchUsers
  }
})
