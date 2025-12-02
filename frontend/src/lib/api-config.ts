/**
 * AVATAR API Configuration
 *
 * Centralizes all API endpoints, WebSocket URLs, and configuration constants
 */

// API Base URLs
export const API_CONFIG = {
  // REST API base URL
  // In development: Vite proxy will forward /api to localhost:8000
  // In production: Set via VITE_API_BASE_URL environment variable
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',

  // WebSocket URL
  // Development: Uses relative path '/ws/chat' (proxied by Vite to ws://localhost:8000/ws/chat)
  // Production: Set via VITE_WS_URL environment variable (e.g., wss://domain.com/ws/chat)
  WS_URL: import.meta.env.VITE_WS_URL || (
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? `wss://${window.location.host}/ws/chat`
      : `ws://${window.location.host}/ws/chat`
  ),

  // Audio configuration
  AUDIO: {
    SAMPLE_RATE: 16000,        // Hz
    MAX_DURATION: 60,          // seconds
    CHUNK_SIZE: 32768,         // bytes (32KB)
    SUPPORTED_FORMATS: ['audio/wav', 'audio/mp3', 'audio/flac', 'audio/webm']
  },

  // Request timeouts
  TIMEOUTS: {
    REQUEST: 30000,            // 30 seconds
    WEBSOCKET: 60000,          // 60 seconds
    UPLOAD: 120000             // 2 minutes for large file uploads
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  }
};

// TypeScript Type Definitions
// These should match the backend Pydantic models

export interface VoiceProfile {
  id: string;
  name: string;
  description?: string;
  reference_text?: string;
  audio_path: string;
  file_size: number;
  created_at: string;
  updated_at?: string;
}

export interface Conversation {
  id: number;
  session_id: string;
  user_input: string;
  ai_response: string;
  voice_profile_id?: number;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ConversationSession {
  session_id: string;
  first_message: string;
  turn_count: number;
  created_at: string;
  last_activity: string;
  voice_profile_name?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  database: boolean | string;
}

export interface SystemInfo {
  version: string;
  config: {
    max_concurrent_sessions: number;
    vram_limit_gb: number;
  };
  gpu: {
    available: boolean;
    device_name?: string;
    total_memory_gb?: number;
    allocated_memory_gb?: number;
    reserved_memory_gb?: number;
  };
}

export interface VRAMStatus {
  gpu_id: number;
  total_gb: number;
  used_gb: number;
  available_gb: number;
  utilization_percent: number;
}

export interface SessionStatus {
  active_sessions: number;
  max_sessions: number;
  queue_length: number;
  sessions: Array<{
    session_id: string;
    created_at: string;
    stage: string;
  }>;
}

export interface ModelStatus {
  preload_status: Record<string, {
    loaded: boolean;
    load_time: number;
    error: string | null;
  }>;
  total_preload_time: number;
  loaded_models: string[];
  failed_models: string[];
  models_ready: number;
  total_models: number;
}

// ==================== New Type Definitions ====================

/**
 * Voice profile list response
 */
export interface VoiceProfileList {
  profiles: VoiceProfile[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Conversation list response (with pagination)
 */
export interface ConversationList {
  sessions: ConversationSession[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * Complete conversation history response
 */
export interface ConversationHistory {
  session_id: string;
  turns: ConversationTurn[];
  total_turns: number;
  session_created: string;  // ISO 8601 datetime
}

/**
 * Individual conversation turn
 */
export interface ConversationTurn {
  id: number;
  session_id: string;
  turn_number: number;
  user_text: string;
  ai_text: string;
  user_audio_path: string | null;
  ai_audio_fast_path: string | null;
  ai_audio_hq_path: string | null;
  voice_profile_id: number | null;
  created_at: string;
  processing_time_ms: number | null;
}

/**
 * Health response from monitoring API
 */
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  error_rate: number;
  critical_errors: number;
  active_alerts: number;
  uptime_seconds: number;
  timestamp: number;
}

/**
 * Alert response model
 */
export interface AlertResponse {
  id: string;
  level: string;
  title: string;
  message: string;
  component: string;
  count: number;
  first_seen: number;
  last_seen: number;
  acknowledged: boolean;
  resolved: boolean;
  metadata: Record<string, any>;
}

/**
 * Error statistics response
 */
export interface ErrorStatsResponse {
  total_errors: number;
  error_breakdown: Record<string, number>;
  recent_error_count: number;
  error_rate_per_minute: number;
}

/**
 * Metrics summary response
 */
export interface MetricsSummaryResponse {
  health: HealthResponse;
  alerts: {
    active: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  errors: ErrorStatsResponse;
  performance: Record<string, any>;
}

// API Error Types
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public detail: string,
    public code?: string
  ) {
    super(detail);
    this.name = 'APIError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class WebSocketError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = 'WebSocketError';
  }
}
