import { ref } from 'vue'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const WS_URL = BASE_URL.replace(/^http/, 'ws') + '/ws'

export class WebSocketService {
  private ws: WebSocket | null = null
  private token: string = ''
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private pingInterval: number | null = null

  public connected = ref(false)
  public connectionError = ref<string | null>(null)
  public onMessage: ((msg: any) => void) | null = null
  public onMentioned: ((data: any) => void) | null = null
  public onConnectionError: ((error: string) => void) | null = null

  connect(token: string) {
    this.token = token
    this.connectionError.value = null
    this.doConnect()
  }

  private doConnect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    const wsUrl = `${WS_URL}?token=${this.token}`
    console.log('WebSocket connecting to:', wsUrl)

    try {
      this.ws = new WebSocket(wsUrl)
    } catch (e) {
      const errorMsg = `WebSocket connection failed: ${e}`
      console.error(errorMsg)
      this.connectionError.value = errorMsg
      this.onConnectionError?.(errorMsg)
      return
    }

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.connected.value = true
      this.connectionError.value = null
      this.reconnectAttempts = 0
      this.startPing()
    }

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason)
      this.connected.value = false
      this.stopPing()

      // 1006 表示异常关闭（如握手失败）
      if (event.code === 1006 && this.reconnectAttempts === 0) {
        const errorMsg = 'WebSocket connection failed. Check server logs for details (possible CORS/Origin issue).'
        console.error(errorMsg)
        this.connectionError.value = errorMsg
        this.onConnectionError?.(errorMsg)
      }

      this.tryReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      // 注意：浏览器的 WebSocket error 事件不包含详细信息
      // 实际错误原因会在 onclose 中通过 code 判断
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        this.handleMessage(msg)
      } catch (e) {
        console.error('Failed to parse message:', e)
      }
    }
  }

  private handleMessage(msg: any) {
    switch (msg.event) {
      case 'new_message':
        this.onMessage?.(msg.data)
        break
      case 'mentioned':
        this.onMentioned?.(msg.data)
        break
      case 'pong':
        break
      default:
        console.log('Unknown event:', msg.event)
    }
  }

  private startPing() {
    this.pingInterval = window.setInterval(() => {
      this.send({ action: 'ping' })
    }, 30000)
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`Reconnecting... attempt ${this.reconnectAttempts}`)

    setTimeout(() => {
      this.doConnect()
    }, this.reconnectDelay)
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  sendMessage(conversationId: string, type: string, content: any, replyToId?: string) {
    this.send({
      action: 'send_message',
      conversation_id: conversationId,
      type,
      content,
      reply_to_id: replyToId
    })
  }

  disconnect() {
    this.stopPing()
    this.ws?.close()
    this.ws = null
  }
}

export const wsService = new WebSocketService()
