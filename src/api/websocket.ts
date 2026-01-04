import { ref } from 'vue'
import type { Message } from './types'

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
  public onMessage: ((msg: any) => void) | null = null
  public onMentioned: ((data: any) => void) | null = null

  connect(token: string) {
    this.token = token
    this.doConnect()
  }

  private doConnect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(`${WS_URL}?token=${this.token}`)

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.connected.value = true
      this.reconnectAttempts = 0
      this.startPing()
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.connected.value = false
      this.stopPing()
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
    this.ws?.close()
    this.ws = null
  }
}

export const wsService = new WebSocketService()
