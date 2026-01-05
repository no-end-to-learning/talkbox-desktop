<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  // 如果有保存的登录状态，初始化 WebSocket 连接
  if (authStore.token) {
    authStore.init()
    // 后台刷新用户信息（不阻塞界面）
    authStore.fetchCurrentUser().catch(() => {
      // token 失效会自动跳转到登录页
    })
  }
})
</script>
