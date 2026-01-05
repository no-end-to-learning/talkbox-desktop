import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { smallWindow: true }
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/Register.vue'),
      meta: { smallWindow: true }
    },
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/Home.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/bots',
      name: 'Bots',
      component: () => import('@/views/BotList.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// 窗口大小调整函数
async function resizeWindow(small: boolean) {
  try {
    const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()

    if (small) {
      // 登录/注册小窗口
      await win.setMinSize(null)
      await win.setResizable(true)
      await win.setSize(new LogicalSize(420, 560))
      await win.setResizable(false)
      await win.center()
    } else {
      // 主窗口
      await win.setMinSize(null)
      await win.setResizable(true)
      await win.setSize(new LogicalSize(1200, 800))
      await win.setMinSize(new LogicalSize(800, 600))
      await win.center()
    }
  } catch (e: any) {
    console.error('Window resize failed:', e)
  }
}

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.token) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && authStore.token) {
    next('/')
  } else {
    next()
  }
})

router.afterEach((to, from) => {
  // 路由切换后调整窗口大小
  const isSmallWindow = to.meta.smallWindow === true
  const wasSmallWindow = from.meta.smallWindow === true

  // 只在窗口大小需要改变时调整
  if (isSmallWindow !== wasSmallWindow || from.path === '') {
    resizeWindow(isSmallWindow)
  }
})

export default router
