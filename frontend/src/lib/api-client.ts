/**
 * AVATAR REST API Client
 *
 * Provides typed methods for all backend API endpoints
 * Uses Fetch API with proper error handling
 */

import {
  API_CONFIG,
  APIError,
  NetworkError,
  type VoiceProfile,
  type Conversation,
  type ConversationSession,
  type SystemHealth,
  type SystemInfo,
  type VRAMStatus,
  type ModelStatus
} from './api-config';

class AVATARAPIClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUTS.REQUEST;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const url = endpoint.startsWith('http')
        ? endpoint
        : `${this.baseURL}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          response.status,
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code
        );
      }

      // Handle empty responses (e.g., DELETE requests)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      return await response.json();

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new NetworkError('Request timeout');
      }

      throw new NetworkError(
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }

  // ==================== Voice Profiles ====================

  /**
   * Get list of all voice profiles
   */
  async getVoiceProfiles(): Promise<VoiceProfile[]> {
    const response = await this.fetch<{ profiles: VoiceProfile[]; total: number; limit: number; offset: number }>('/voice-profiles');
    return response.profiles;
  }

  /**
   * Upload a new voice profile
   */
  async uploadVoiceProfile(
    name: string,
    audioFile: File,
    description?: string,
    referenceText?: string
  ): Promise<VoiceProfile> {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('audio_file', audioFile);
    if (description) formData.append('description', description);
    if (referenceText) formData.append('reference_text', referenceText);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      API_CONFIG.TIMEOUTS.UPLOAD
    );

    try {
      const response = await fetch(`${this.baseURL}/voice-profiles`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          response.status,
          errorData.detail || 'Upload failed'
        );
      }

      return await response.json();

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      throw new NetworkError(
        error instanceof Error ? error.message : 'Upload failed'
      );
    }
  }

  /**
   * Delete a voice profile
   */
  async deleteVoiceProfile(profileId: string): Promise<void> {
    await this.fetch(`/voice-profiles/${profileId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Test voice profile synthesis
   */
  async testVoiceProfileSynthesis(
    profileId: string,
    text: string
  ): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/voice-profiles/${profileId}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new APIError(response.status, 'Synthesis test failed');
    }

    return await response.blob();
  }

  // ==================== Conversations ====================

  /**
   * Get conversation history with pagination
   */
  async getConversations(
    page: number = 1,
    perPage: number = API_CONFIG.PAGINATION.DEFAULT_LIMIT
  ): Promise<{ sessions: ConversationSession[]; total: number; page: number; per_page: number }> {
    return this.fetch<{ sessions: ConversationSession[]; total: number; page: number; per_page: number }>(
      `/conversations/sessions?page=${page}&per_page=${perPage}`
    );
  }

  /**
   * Search conversations by query
   */
  async searchConversations(
    query: string,
    page: number = 1,
    perPage: number = API_CONFIG.PAGINATION.DEFAULT_LIMIT
  ): Promise<{ sessions: ConversationSession[]; total: number; page: number; per_page: number }> {
    return this.fetch<{ sessions: ConversationSession[]; total: number; page: number; per_page: number }>(
      `/conversations/sessions/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`
    );
  }

  /**
   * Export a conversation session to file
   */
  async exportConversationSession(
    sessionId: string,
    format: 'json' | 'txt' = 'json'
  ): Promise<Blob> {
    const response = await fetch(
      `${this.baseURL}/conversations/${sessionId}/export?format=${format}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      throw new APIError(response.status, 'Export failed');
    }

    return await response.blob();
  }

  // ==================== System Monitoring ====================

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    return this.fetch<SystemHealth>('/health');
  }

  /**
   * Get detailed system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    return this.fetch<SystemInfo>('/system/info');
  }

  /**
   * Get VRAM status for all GPUs
   */
  async getVRAMStatus(): Promise<VRAMStatus[]> {
    const response = await this.fetch<{ gpus: VRAMStatus[] }>('/system/vram/status');
    return response.gpus;
  }

  /**
   * Get model loading status
   */
  async getModelStatus(): Promise<ModelStatus> {
    return this.fetch<ModelStatus>('/system/models/status');
  }

  /**
   * Trigger model preload
   */
  async preloadModels(enableHqTts: boolean = false): Promise<any> {
    return this.fetch('/system/models/preload', {
      method: 'POST',
      body: JSON.stringify({ enable_hq_tts: enableHqTts }),
    });
  }

  /**
   * Trigger model warm-up
   */
  async warmupModels(): Promise<any> {
    return this.fetch('/system/models/warmup', {
      method: 'POST',
    });
  }

  // ==================== Voice Profiles (Extended) ====================

  /**
   * Get a specific voice profile by ID
   */
  async getVoiceProfile(profileId: string): Promise<VoiceProfile> {
    return this.fetch<VoiceProfile>(`/voice-profiles/${profileId}`);
  }

  /**
   * Update an existing voice profile
   */
  async updateVoiceProfile(
    profileId: string,
    data: {
      name?: string;
      description?: string;
      reference_text?: string;
    },
    audioFile?: File
  ): Promise<VoiceProfile> {
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (data.reference_text) formData.append('reference_text', data.reference_text);
    if (audioFile) formData.append('audio_file', audioFile);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      API_CONFIG.TIMEOUTS.UPLOAD
    );

    try {
      const response = await fetch(`${this.baseURL}/voice-profiles/${profileId}`, {
        method: 'PUT',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(response.status, errorData.detail || 'Update failed');
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof APIError) throw error;
      throw new NetworkError(error instanceof Error ? error.message : 'Update failed');
    }
  }

  /**
   * Download voice profile audio file
   */
  async getVoiceProfileAudio(profileId: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/voice-profiles/${profileId}/audio`);

    if (!response.ok) {
      throw new APIError(response.status, 'Audio download failed');
    }

    return await response.blob();
  }

  // ==================== Conversations (Extended) ====================

  /**
   * Get complete conversation history for a specific session
   */
  async getConversationHistory(
    sessionId: string,
    limit: number = 50
  ): Promise<any> {
    return this.fetch<any>(
      `/conversations/${sessionId}?limit=${limit}`
    );
  }

  /**
   * Delete a conversation session and all its turns
   */
  async deleteConversationSession(sessionId: string): Promise<void> {
    await this.fetch(`/conversations/${sessionId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Download audio file from specific conversation turn
   */
  async getConversationAudio(
    sessionId: string,
    turnNumber: number,
    audioType: 'user' | 'ai_fast' | 'ai_hq' = 'ai_fast'
  ): Promise<Blob> {
    const response = await fetch(
      `${this.baseURL}/conversations/${sessionId}/audio/${turnNumber}?audio_type=${audioType}`
    );

    if (!response.ok) {
      throw new APIError(response.status, 'Audio download failed');
    }

    return await response.blob();
  }

  /**
   * Get conversation statistics and metrics
   */
  async getConversationStats(): Promise<any> {
    return this.fetch('/conversations/sessions/stats');
  }

  // ==================== VRAM Management ====================

  /**
   * Get VRAM usage history
   */
  async getVRAMHistory(
    deviceId: number = 0,
    minutes: number = 10
  ): Promise<any> {
    return this.fetch(
      `/system/vram/history?device_id=${deviceId}&minutes=${minutes}`
    );
  }

  /**
   * Force GPU memory cleanup
   */
  async triggerVRAMCleanup(deviceId?: number): Promise<any> {
    const params = deviceId !== undefined ? `?device_id=${deviceId}` : '';
    return this.fetch(`/system/vram/cleanup${params}`, {
      method: 'POST',
    });
  }

  /**
   * Predict if system can handle a new service request
   */
  async predictServiceCapacity(
    serviceType: 'stt' | 'llm' | 'tts_fast' | 'tts_hq'
  ): Promise<any> {
    return this.fetch(
      `/system/vram/predict?service_type=${serviceType}`
    );
  }

  // ==================== Monitoring API ====================

  /**
   * Get current system health status
   */
  async getMonitoringHealth(): Promise<any> {
    return this.fetch('/v1/monitoring/health');
  }

  /**
   * Get current system alerts
   */
  async getMonitoringAlerts(
    includeResolved: boolean = false,
    level?: string
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (includeResolved) params.append('include_resolved', 'true');
    if (level) params.append('level', level);

    const queryString = params.toString();
    return this.fetch(`/v1/monitoring/alerts${queryString ? '?' + queryString : ''}`);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<any> {
    return this.fetch(`/v1/monitoring/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<any> {
    return this.fetch(`/v1/monitoring/alerts/${alertId}/resolve`, {
      method: 'POST',
    });
  }

  /**
   * Get error statistics
   */
  async getErrorStatistics(): Promise<any> {
    return this.fetch('/v1/monitoring/errors');
  }

  /**
   * Get recent error details
   */
  async getRecentErrors(
    limit: number = 50,
    severity?: string
  ): Promise<any> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (severity) params.append('severity', severity);

    return this.fetch(`/v1/monitoring/errors/recent?${params}`);
  }

  /**
   * Get comprehensive metrics summary
   */
  async getMetricsSummary(): Promise<any> {
    return this.fetch('/v1/monitoring/metrics');
  }

  /**
   * Get metrics in Prometheus format
   */
  async getPrometheusMetrics(): Promise<string> {
    const response = await fetch(`${this.baseURL}/v1/monitoring/metrics/prometheus`);

    if (!response.ok) {
      throw new APIError(response.status, 'Failed to fetch Prometheus metrics');
    }

    return await response.text();
  }

  /**
   * Get detailed performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    return this.fetch('/v1/monitoring/performance');
  }

  /**
   * Get dashboard-ready data
   */
  async getDashboardData(): Promise<any> {
    return this.fetch('/v1/monitoring/dashboard');
  }

  /**
   * Reset monitoring statistics (admin only)
   */
  async resetMonitoringStats(): Promise<any> {
    return this.fetch('/v1/monitoring/monitoring/reset', {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const avatarAPI = new AVATARAPIClient();
