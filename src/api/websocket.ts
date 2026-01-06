import { ref } from 'vue'
import { getServerUrl } from './config'

function getWsUrl(): string {
  return getServerUrl().replace(/^http/, 'ws') + '/ws'
}

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

    const wsUrl = `${getWsUrl()}?token=${this.token}`

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

      if (event.code === 1006 && this.reconnectAttempts === 0) {
        const errorMsg = 'WebSocket connection failed. Check server logs for details.'
        console.error(errorMsg)
        this.connectionError.value = errorMsg
        this.onConnectionError?.(errorMsg)
      }

      this.tryReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
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
    this.reconnectAttempts = this.maxReconnectAttempts
    this.ws?.close()
    this.ws = null
  }
}

export const wsService = new WebSocketService()
