// WebSocket client for connecting to native daemon at ws://127.0.0.1:9876

import { ref, type Ref } from 'vue'

export interface DaemonClient {
  connected: Ref<boolean>
  version: Ref<string>
  connect(): void
  disconnect(): void
  send(type: string, payload?: any): void
  onMessage: ((type: string, payload: any) => void) | null
}

const DAEMON_URL = 'ws://127.0.0.1:9876'
const RETRY_INTERVAL = 10000

export function createDaemonClient(): DaemonClient {
  const connected = ref(false)
  const version = ref('')
  let ws: WebSocket | null = null
  let retryTimer: number | null = null

  const client: DaemonClient = {
    connected,
    version,
    onMessage: null,

    connect() {
      if (ws) return
      try {
        ws = new WebSocket(DAEMON_URL)

        ws.onopen = () => {
          client.send('ping')
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'pong') {
              connected.value = true
              version.value = msg.payload?.version ?? ''
            }
            if (client.onMessage) {
              client.onMessage(msg.type, msg.payload)
            }
          } catch {}
        }

        ws.onclose = () => {
          connected.value = false
          ws = null
          scheduleRetry()
        }

        ws.onerror = () => {
          ws?.close()
        }
      } catch {
        scheduleRetry()
      }
    },

    disconnect() {
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
      ws?.close()
      ws = null
      connected.value = false
    },

    send(type: string, payload?: any) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({ id: crypto.randomUUID(), type, payload: payload ?? {} }))
    },
  }

  function scheduleRetry() {
    if (retryTimer) return
    retryTimer = window.setTimeout(() => {
      retryTimer = null
      client.connect()
    }, RETRY_INTERVAL)
  }

  return client
}
