export interface User {
  id: string
  username: string
  nickname: string
  avatar: string
}

export interface Conversation {
  id: string
  type: 'private' | 'group'
  name: string
  avatar: string
  owner_id: string
  created_at: string
  updated_at: string
  members?: Member[]
  bots?: Bot[]
}

export interface Member {
  id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  nickname: string
  user: User
}

export interface Message {
  id: string
  conversation_id: string
  sender: {
    id: string
    type: 'user' | 'bot'
    nickname: string
    avatar: string
  }
  type: 'text' | 'image' | 'video' | 'file' | 'card'
  content: TextContent | ImageContent | VideoContent | FileContent | CardContent
  reply_to_id?: string
  reply_to?: {
    id: string
    type: string
    content: any
    sender_name: string
  }
  created_at: string
}

export interface TextContent {
  text: string
  mentions?: string[]
}

export interface ImageContent {
  url: string
  width: number
  height: number
  size: number
  thumbnail?: string
}

export interface VideoContent {
  url: string
  duration: number
  size: number
  thumbnail?: string
}

export interface FileContent {
  url: string
  name: string
  size: number
  mime_type: string
}

export interface CardContent {
  color?: string
  title: string
  content?: string
  note?: string
  url?: string
}

export interface Bot {
  id: string
  name: string
  avatar: string
  description: string
  token?: string
  created_at: string
}

export interface Friend {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted' | 'blocked'
  friend: User
}

export interface ApiResponse<T> {
  code: number
  message?: string
  data?: T
}
