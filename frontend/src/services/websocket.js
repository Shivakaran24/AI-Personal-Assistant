/**
 * Real-Time WebSocket Client Service with Automatic Reconnect
 * Connects to ws://localhost:8000/api/ws (or relative host)
 * Pushes instant (< 1ms) updates for HITL actions & Calendar RSVP changes.
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map(); // event -> Set(callbacks)
    this.reconnectInterval = 3000;
    this.pingInterval = null;
    this.isConnected = false;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // In dev mode (Vite on port 5173), proxy or direct to backend port 8000
    const wsUrl = `${protocol}//${window.location.hostname}:8000/api/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("⚡ [WebSocket] Connected to real-time event stream.");
        this.isConnected = true;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: eventName, data } = payload;

          if (eventName === 'pong') return;

          // Dispatch to registered event listeners
          if (this.listeners.has(eventName)) {
            this.listeners.get(eventName).forEach(cb => cb(data));
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        console.warn(`⚡ [WebSocket] Disconnected. Reconnecting in ${this.reconnectInterval / 1000}s...`);
        setTimeout(() => this.connect(), this.reconnectInterval);
      };

      this.ws.onerror = (err) => {
        console.error("WebSocket connection error:", err);
        this.ws?.close();
      };

    } catch (err) {
      console.error("Failed to establish WebSocket connection:", err);
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send("ping");
      }
    }, 15000);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);

    // Ensure connection is active
    this.connect();

    // Return unsubscribe function
    return () => {
      if (this.listeners.has(eventName)) {
        this.listeners.get(eventName).delete(callback);
      }
    };
  }
}

export const wsService = new WebSocketService();
