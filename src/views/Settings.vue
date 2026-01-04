<template>
  <div class="settings-page">
    <div class="settings-card">
      <h2>设置</h2>

      <section class="section">
        <h3>个人信息</h3>
        <div class="form-item">
          <label>用户名</label>
          <input :value="authStore.user?.username" disabled />
        </div>
        <div class="form-item">
          <label>昵称</label>
          <input v-model="nickname" placeholder="请输入昵称" />
        </div>
        <button class="primary" @click="updateProfile">保存修改</button>
      </section>

      <section class="section">
        <h3>Bot 管理</h3>
        <p class="desc">创建和管理你的 Bot，用于自动发送消息到群聊。</p>
        <button class="default" @click="router.push('/bots')">管理 Bot</button>
      </section>

      <section class="section">
        <h3>退出登录</h3>
        <button class="danger" @click="logout">退出登录</button>
      </section>

      <button class="back" @click="router.push('/')">← 返回</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const nickname = ref('')

onMounted(() => {
  nickname.value = authStore.user?.nickname || ''
})

async function updateProfile() {
  try {
    await authStore.updateProfile({ nickname: nickname.value })
    alert('保存成功')
  } catch (e: any) {
    alert(e.message || '保存失败')
  }
}

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.settings-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.settings-card {
  background: white;
  padding: 40px;
  border-radius: 8px;
  width: 500px;
  box-shadow: var(--shadow);
}

.settings-card h2 {
  margin-bottom: 30px;
}

.section {
  margin-bottom: 30px;
  padding-bottom: 30px;
  border-bottom: 1px solid var(--border);
}

.section h3 {
  margin-bottom: 16px;
  font-size: 16px;
}

.section .desc {
  color: var(--text-secondary);
  margin-bottom: 16px;
  font-size: 14px;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.form-item input {
  width: 100%;
}

.form-item input:disabled {
  background: var(--bg);
  cursor: not-allowed;
}

.danger {
  background: var(--error);
  color: white;
}

.danger:hover {
  background: #ff7875;
}

.back {
  background: none;
  color: var(--primary);
  padding: 0;
  margin-top: 20px;
}

.back:hover {
  text-decoration: underline;
}
</style>
