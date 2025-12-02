/**
 * AVATAR WebSocket Client
 *
 * Manages WebSocket connection for real-time voice conversation
 * Handles audio streaming, message protocol, and connection state
 */

import { API_CONFIG } from './api-config';

// Connection States
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Message Types (Server → Client)
export interface StatusMessage {
  type: 'status';
  stage: 'stt' | 'llm' | 'tts' | 'ready' | 'processing';
  session_id: string;
  message?: string;
}

export interface TranscriptMessage {
  type: 'transcript';
  text: string;
  confidence?: number;
}

export interface AIResponseMessage {
  type: 'ai_response';
  text: string;
  is_final: boolean;
}

export interface TTSReadyMessage {
  type: 'tts_ready';
  audio_url: string;
  duration?: number;
}

export interface ErrorMessage {
  type: 'error';
  error: string;
  code?: string;
}

export interface ConnectionMessage {
  type: 'connected';
  session_id: string;
}

export type ServerMessage =
  | StatusMessage
  | TranscriptMessage
  | AIResponseMessage
  | TTSReadyMessage
  | ErrorMessage
  | ConnectionMessage;

// Message Types (Client → Server)
export interface AudioChunkMessage {
  type: 'audio_chunk';
  data: string; // base64 encoded
  chunk_index: number;
}

export interface AudioEndMessage {
  type: 'audio_end';
  total_chunks: number;
  voice_profile_id?: number;
}

export type ClientMessage = AudioChunkMessage | AudioEndMessage;

// Event Handlers
export interface WebSocketEventHandlers {
  onConnected?: (sessionId: string) => void;
  onDisconnected?: (reason: string) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onStatus?: (status: StatusMessage) => void;
  onTranscript?: (transcript: TranscriptMessage) => void;
  onAIResponse?: (response: AIResponseMessage) => void;
  onTTSReady?: (tts: TTSReadyMessage) => void;
  onError?: (error: ErrorMessage) => void;
}

// WebSocket Client Configuration
export interface WebSocketConfig {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  autoReconnect: true,
  reconnectInterval: 3000,     // 3 seconds
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,    // 30 seconds
};

export class AVATARWebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private handlers: WebSocketEventHandlers;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _connectionState: ConnectionState = ConnectionState.DISCONNECTED;

  public get isConnected(): boolean {
    return this._connectionState === ConnectionState.CONNECTED;
  }

  public get connectionState(): ConnectionState {
    return this._connectionState;
  }

  constructor(
    config: WebSocketConfig = {},
    handlers: WebSocketEventHandlers = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.handlers = handlers;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(sessionId?: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Build WebSocket URL
        let wsUrl = API_CONFIG.WS_URL;
        if (sessionId) {
          wsUrl += `?session_id=${encodeURIComponent(sessionId)}`;
          this.sessionId = sessionId;
        }

        this.updateConnectionState(ConnectionState.CONNECTING);

        this.ws = new WebSocket(wsUrl);

        // Connection opened
        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.reconnectAttempts = 0;
          this.updateConnectionState(ConnectionState.CONNECTED);
          this.startHeartbeat();
          resolve(true);
        };

        // Message received
        this.ws.onmessage = (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            this.handleServerMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        // Connection error
        this.ws.onerror = (event) => {
          console.error('[WebSocket] Error:', event);
          this.updateConnectionState(ConnectionState.ERROR);
          resolve(false);
        };

        // Connection closed
        this.ws.onclose = (event) => {
          console.log('[WebSocket] Closed:', event.code, event.reason);
          this.stopHeartbeat();
          this.updateConnectionState(ConnectionState.DISCONNECTED);

          this.handlers.onDisconnected?.(
            event.reason || `Code: ${event.code}`
          );

          // Auto-reconnect
          if (this.config.autoReconnect &&
              this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

      } catch (error) {
        console.error('[WebSocket] Connection failed:', error);
        this.updateConnectionState(ConnectionState.ERROR);
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }

    this.updateConnectionState(ConnectionState.DISCONNECTED);
    this.sessionId = null;
  }

  /**
   * Send audio chunk to server
   */
  sendAudioChunk(base64Data: string, chunkIndex: number): boolean {
    if (!this.isConnected || !this.ws) {
      console.error('[WebSocket] Cannot send audio chunk: not connected');
      return false;
    }

    const message: AudioChunkMessage = {
      type: 'audio_chunk',
      data: base64Data,
      chunk_index: chunkIndex,
    };

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to send audio chunk:', error);
      return false;
    }
  }

  /**
   * Send audio end signal
   */
  sendAudioEnd(totalChunks: number, voiceProfileId?: number): boolean {
    if (!this.isConnected || !this.ws) {
      console.error('[WebSocket] Cannot send audio end: not connected');
      return false;
    }

    const message: AudioEndMessage = {
      type: 'audio_end',
      total_chunks: totalChunks,
      voice_profile_id: voiceProfileId,
    };

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to send audio end:', error);
      return false;
    }
  }

  /**
   * Handle incoming server messages
   */
  private handleServerMessage(message: ServerMessage): void {
    console.log('[WebSocket] Message:', message.type);

    switch (message.type) {
      case 'connected':
        this.sessionId = message.session_id;
        this.handlers.onConnected?.(message.session_id);
        break;

      case 'status':
        this.handlers.onStatus?.(message);
        break;

      case 'transcript':
        this.handlers.onTranscript?.(message);
        break;

      case 'ai_response':
        this.handlers.onAIResponse?.(message);
        break;

      case 'tts_ready':
        this.handlers.onTTSReady?.(message);
        break;

      case 'error':
        this.handlers.onError?.(message);
        break;

      default:
        console.warn('[WebSocket] Unknown message type:', (message as any).type);
    }
  }

  /**
   * Update connection state and notify handlers
   */
  private updateConnectionState(state: ConnectionState): void {
    if (this._connectionState !== state) {
      this._connectionState = state;
      this.handlers.onConnectionStateChange?.(state);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.updateConnectionState(ConnectionState.RECONNECTING);

    console.log(
      `[WebSocket] Reconnecting in ${this.config.reconnectInterval}ms ` +
      `(attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.sessionId || undefined);
    }, this.config.reconnectInterval);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('[WebSocket] Heartbeat failed:', error);
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
