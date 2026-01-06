const DEFAULT_SERVER_URL = 'https://talkbox.qiujun.me'

const STORAGE_KEYS = {
  serverUrl: 'server_url',
  savedUsername: 'saved_username',
  savedPassword: 'saved_password'
}

export function getServerUrl(): string {
  return localStorage.getItem(STORAGE_KEYS.serverUrl) || DEFAULT_SERVER_URL
}

export function setServerUrl(url: string) {
  localStorage.setItem(STORAGE_KEYS.serverUrl, url)
}

export function getSavedCredentials(): { username: string; password: string } {
  return {
    username: localStorage.getItem(STORAGE_KEYS.savedUsername) || '',
    password: localStorage.getItem(STORAGE_KEYS.savedPassword) || ''
  }
}

export function saveCredentials(username: string, password: string) {
  localStorage.setItem(STORAGE_KEYS.savedUsername, username)
  localStorage.setItem(STORAGE_KEYS.savedPassword, password)
}

export { DEFAULT_SERVER_URL }
