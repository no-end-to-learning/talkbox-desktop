<template>
  <div class="login-page">
    <div class="drag-region" data-tauri-drag-region></div>

    <div class="login-container">
      <div class="login-header">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h1>TalkBox</h1>
        <p>登录以开始聊天</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-item">
          <label>服务器地址</label>
          <input
            v-model="serverUrl"
            type="url"
            placeholder="https://talkbox.qiujun.me"
            required
          />
        </div>
        <div class="form-item">
          <label>用户名</label>
          <input
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            required
          />
        </div>
        <div class="form-item">
          <label>密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            required
          />
        </div>

        <div v-if="error" class="error-message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ error }}
        </div>

        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="login-footer">
        <span>还没有账号？</span>
        <router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getServerUrl, setServerUrl, getSavedCredentials, saveCredentials } from '@/api/config'
import { updateBaseUrl } from '@/api/http'

const router = useRouter()
const authStore = useAuthStore()

const serverUrl = ref('')
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

onMounted(() => {
  serverUrl.value = getServerUrl()
  const saved = getSavedCredentials()
  username.value = saved.username
  password.value = saved.password
})

async function handleLogin() {
  if (!serverUrl.value || !username.value || !password.value) return

  loading.value = true
  error.value = ''

  // 保存凭据和服务器地址
  const url = serverUrl.value.replace(/\/+$/, '')
  setServerUrl(url)
  updateBaseUrl(url)
  saveCredentials(username.value, password.value)

  try {
    await authStore.login(username.value, password.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.message || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-white);
  position: relative;
}

.drag-region {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 20px;
  -webkit-app-region: drag;
}

.login-container {
  width: 100%;
  max-width: 320px;
  padding: 20px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  background: linear-gradient(135deg, var(--primary) 0%, #5b8def 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo svg {
  width: 28px;
  height: 28px;
  color: white;
}

.login-header h1 {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.login-header p {
  font-size: 13px;
  color: var(--text-secondary);
}

.login-form {
  margin-bottom: 20px;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-item input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  font-size: 14px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: var(--radius-md);
  color: var(--error);
  font-size: 13px;
}

.error-message svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.login-btn {
  width: 100%;
  height: 42px;
  background: var(--primary);
  color: white;
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.login-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.login-footer a {
  color: var(--primary);
  font-weight: 500;
  margin-left: 4px;
}

.login-footer a:hover {
  color: var(--primary-hover);
}
</style>
