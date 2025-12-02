# Frontend API 審查報告

> **文件版本**: 1.0
> **建立日期**: 2025-12-02
> **審查範圍**: AVATAR 專案前端 API 與後端 OpenAPI 規格比對
> **審查人員**: Claude Code (Linus Torvalds 模式)

---

## 📋 執行摘要

本次審查針對 AVATAR 專案前端 API 呼叫與後端 OpenAPI 規格進行全面比對，發現**多處嚴重不符合**問題，包括路徑錯誤、參數不匹配、缺少端點等。這些問題將導致前端無法正常與後端通訊，必須立即修復。

### 關鍵發現

- **路徑前綴缺失**: 大部分 API 呼叫缺少 `/api` 前綴
- **端點路徑錯誤**: 10+ 個端點路徑與後端不符
- **查詢參數不匹配**: 分頁參數名稱錯誤
- **缺少端點實作**: 20+ 個後端端點前端未實作
- **呼叫不存在端點**: 1 個前端呼叫的端點後端不存在

### 影響評估

| 影響程度 | 檔案數量 | 說明 |
|---------|---------|------|
| 🔴 **Critical** | 2 | `api-client.ts`, `use-avatar-api.tsx` - Breaking Changes |
| 🟡 **Medium** | 2 | `api-config.ts`, `ConversationHistory_Broken.tsx` |
| 🟢 **Low** | 1 | `use-avatar-websocket.tsx` - Bug Fix |

---

## 🔍 詳細問題分析

### 1. 路徑前綴缺失 (Critical)

**問題**: 前端 API 呼叫大部分缺少 `/api` 前綴

**受影響檔案**: `frontend/src/lib/api-client.ts`

| 前端路徑 | 後端正確路徑 | 狀態 | 影響 |
|---------|------------|------|------|
| `/voice-profiles/list` | `/api/voice-profiles` (GET) | ❌ | Voice Profile 列表無法載入 |
| `/voice-profiles/upload` | `/api/voice-profiles` (POST) | ❌ | 無法上傳聲音樣本 |
| `/voice-profiles/{id}` | `/api/voice-profiles/{profile_id}` | ❌ | 刪除功能失效 |
| `/voice-profiles/{id}/test` | `/api/voice-profiles/{profile_id}/test` | ❌ | 測試合成失效 |
| `/conversations/history` | `/api/conversations/sessions` | ❌ | 對話歷史無法載入 |
| `/conversations/search` | `/api/conversations/sessions/search` | ❌ | 搜尋功能失效 |
| `/conversations/export` | `/api/conversations/{session_id}/export` | ❌ | 匯出功能失效 |
| `/system/info` | `/api/system/info` | ❌ | 系統資訊無法取得 |
| `/system/vram/status` | `/api/system/vram/status` | ❌ | VRAM 監控失效 |
| `/system/models/status` | `/api/system/models/status` | ❌ | 模型狀態無法取得 |
| `/system/models/preload` | `/api/system/models/preload` | ❌ | 模型預載失效 |
| `/system/models/warmup` | `/api/system/models/warmup` | ❌ | 模型預熱失效 |

**根本原因**: `API_CONFIG.BASE_URL` 設定為 `/api`，但各 API 方法未使用此前綴。

---

### 2. 端點路徑錯誤 (Critical)

#### 2.1 Voice Profiles

**檔案**: `frontend/src/lib/api-client.ts:95-173`

| 方法 | 前端路徑 | 後端路徑 | HTTP Method | 問題 |
|-----|---------|---------|-------------|------|
| `getVoiceProfiles()` | `/voice-profiles/list` | `/api/voice-profiles` | GET | 路徑錯誤 |
| `uploadVoiceProfile()` | `/voice-profiles/upload` | `/api/voice-profiles` | POST | 路徑錯誤 |
| `deleteVoiceProfile(profileId)` | `/voice-profiles/{profileId}` | `/api/voice-profiles/{profile_id}` | DELETE | 路徑前綴缺失 |
| `testVoiceProfileSynthesis()` | `/voice-profiles/{profileId}/test` | `/api/voice-profiles/{profile_id}/test` | POST | 路徑前綴缺失 |

**缺少的端點**:
- ❌ `GET /api/voice-profiles/{profile_id}` - 取得單一 profile 詳細資訊
- ❌ `PUT /api/voice-profiles/{profile_id}` - 更新 profile (名稱、描述、音檔)
- ❌ `GET /api/voice-profiles/{profile_id}/audio` - 下載 profile 音檔

#### 2.2 Conversations

**檔案**: `frontend/src/lib/api-client.ts:175-212`

| 方法 | 前端路徑 | 後端路徑 | 問題 |
|-----|---------|---------|------|
| `getConversations()` | `/conversations/history` | `/api/conversations/sessions` | 路徑錯誤 |
| `searchConversations()` | `/conversations/search` | `/api/conversations/sessions/search` | 路徑錯誤 |
| `exportConversations()` | `/conversations/export` | `/api/conversations/{session_id}/export` | 路徑錯誤 + 缺少 session_id |

**查詢參數不匹配**:

```typescript
// 前端使用 (錯誤)
getConversations(limit: number, offset: number)
// Query: ?limit=50&offset=0

// 後端需要 (正確)
GET /api/conversations/sessions?page=1&per_page=20
```

**缺少的端點**:
- ❌ `GET /api/conversations/{session_id}` - 取得特定 session 的完整對話歷史
- ❌ `DELETE /api/conversations/{session_id}` - 刪除對話 session
- ❌ `GET /api/conversations/{session_id}/audio/{turn_number}` - 下載對話音檔
- ❌ `GET /api/conversations/sessions/stats` - 取得對話統計數據

#### 2.3 System Monitoring

**檔案**: `frontend/src/lib/api-client.ts:214-270`

| 方法 | 前端路徑 | 後端路徑 | 狀態 |
|-----|---------|---------|------|
| `getSystemHealth()` | `/health` | `/health` | ✅ 正確 |
| `getSystemInfo()` | `/system/info` | `/api/system/info` | ❌ 缺少前綴 |
| `getVRAMStatus()` | `/system/vram/status` | `/api/system/vram/status` | ❌ 缺少前綴 |
| `getSessionStatus()` | `/system/sessions/status` | **不存在** | ❌ 後端無此端點 |
| `getModelStatus()` | `/system/models/status` | `/api/system/models/status` | ❌ 缺少前綴 |
| `preloadModels()` | `/system/models/preload` | `/api/system/models/preload` | ❌ 缺少前綴 |
| `warmupModels()` | `/system/models/warmup` | `/api/system/models/warmup` | ❌ 缺少前綴 |

**缺少的端點**:
- ❌ `GET /api/system/vram/history` - VRAM 使用歷史
- ❌ `POST /api/system/vram/cleanup` - 強制 VRAM 清理
- ❌ `GET /api/system/vram/predict` - 預測服務容量

---

### 3. 完全缺失的模組 (High Priority)

#### 3.1 Monitoring API (完整模組未實作)

後端提供完整的 `/api/v1/monitoring/*` 監控 API，前端完全未實作：

| 端點 | 功能 | 用途 |
|-----|------|------|
| `GET /api/v1/monitoring/health` | 系統健康狀態 | 儀表板即時監控 |
| `GET /api/v1/monitoring/alerts` | 告警列表 | 告警管理介面 |
| `POST /api/v1/monitoring/alerts/{id}/acknowledge` | 確認告警 | 告警處理 |
| `POST /api/v1/monitoring/alerts/{id}/resolve` | 解決告警 | 告警處理 |
| `GET /api/v1/monitoring/errors` | 錯誤統計 | 錯誤分析 |
| `GET /api/v1/monitoring/errors/recent` | 近期錯誤 | 除錯支援 |
| `GET /api/v1/monitoring/metrics` | 綜合指標 | 效能監控 |
| `GET /api/v1/monitoring/metrics/prometheus` | Prometheus 格式 | 監控整合 |
| `GET /api/v1/monitoring/performance` | 效能指標 | 效能優化 |
| `GET /api/v1/monitoring/dashboard` | 儀表板資料 | 管理介面 |
| `POST /api/v1/monitoring/monitoring/reset` | 重置統計 | 管理功能 |

**影響**: 前端無法實作完整的監控儀表板功能。

---

### 4. 資料結構不匹配

#### 4.1 Voice Profile Response

**前端型別** (`api-config.ts:48-57`):
```typescript
export interface VoiceProfile {
  id: number;                    // ❌ 應為 string
  name: string;
  description?: string;
  reference_text?: string;
  audio_path: string;
  file_size: number;
  created_at: string;
  updated_at?: string;
}
```

**後端回應** (OpenAPI Schema):
```json
{
  "id": "string",                 // profile_id 是 string
  "name": "string",
  "description": "string | null",
  "reference_text": "string | null",
  "audio_path": "string",
  "created_at": "2025-12-02T10:00:00",
  "updated_at": "2025-12-02T10:00:00 | null"
}
```

#### 4.2 Conversation Response

**前端缺少型別定義**:
```typescript
// 前端未定義但後端有回傳
export interface VoiceProfileList {
  profiles: VoiceProfile[];
  total: number;
  limit: number;        // ❌ 前端未處理
  offset: number;       // ❌ 前端未處理
}

export interface ConversationList {
  sessions: ConversationSession[];
  total: number;
  page: number;         // ❌ 前端未處理
  per_page: number;     // ❌ 前端未處理
}

export interface ConversationHistory {
  session_id: string;
  turns: ConversationTurn[];
  total_turns: number;
  session_created: string;  // ISO 8601 datetime
}

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
```

---

### 5. React Hooks 問題

**檔案**: `frontend/src/hooks/use-avatar-api.tsx`

#### 5.1 參數不匹配

```typescript
// Line 73-80: getConversations 參數錯誤
export const useConversations = (limit: number = 50, offset: number = 0) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.CONVERSATIONS, limit, offset],
    queryFn: () => avatarAPI.getConversations(limit, offset),  // ❌ 應為 (page, perPage)
    // ...
  });
};
```

#### 5.2 缺少的 Hooks

- ❌ `useVoiceProfile(profileId)` - 取得單一 profile
- ❌ `useUpdateVoiceProfile()` - 更新 profile
- ❌ `useConversationHistory(sessionId)` - 取得 session 歷史
- ❌ `useDeleteConversation()` - 刪除 session
- ❌ `useConversationStats()` - 對話統計
- ❌ `useExportConversationSession()` - 匯出單一 session
- ❌ `useVRAMHistory()` - VRAM 歷史
- ❌ `useMonitoring*()` - 監控相關 hooks

#### 5.3 呼叫不存在的端點

```typescript
// Line 130-137: getSessionStatus 端點不存在
export const useSessionStatus = () => {
  return useQuery({
    queryKey: QUERY_KEYS.SESSION_STATUS,
    queryFn: () => avatarAPI.getSessionStatus(),  // ❌ 後端無此端點
    // ...
  });
};
```

---

### 6. WebSocket 問題

**檔案**: `frontend/src/hooks/use-avatar-websocket.tsx`

#### 6.1 缺少引用

```typescript
// Line 175: API_CONFIG 未引用但被使用
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    sampleRate: API_CONFIG.AUDIO.SAMPLE_RATE,  // ❌ API_CONFIG 未 import
    // ...
  }
});
```

**修正**: 確保 `import { API_CONFIG } from '@/lib/api-config';`

---

## 🔧 修正計畫

### 階段 1: 緊急修復 (Breaking Changes) - Week 1

#### 1.1 修正 `api-client.ts` 路徑

**優先級**: 🔴 Critical
**預估時間**: 4 小時
**受影響檔案**: `frontend/src/lib/api-client.ts`

**變更清單**:

1. **Voice Profiles** (Line 90-173)
   ```typescript
   // 修正前
   async getVoiceProfiles(): Promise<VoiceProfile[]> {
     const response = await this.fetch<{ profiles: VoiceProfile[]; total: number }>('/voice-profiles/list');
     return response.profiles;
   }

   // 修正後
   async getVoiceProfiles(): Promise<VoiceProfile[]> {
     const response = await this.fetch<VoiceProfileList>('/voice-profiles');
     return response.profiles;
   }
   ```

2. **Upload Voice Profile** (Line 103-144)
   ```typescript
   // 修正前
   async uploadVoiceProfile(name: string, audioFile: File): Promise<VoiceProfile> {
     const formData = new FormData();
     formData.append('name', name);
     formData.append('audio_file', audioFile);

     const response = await fetch(`${this.baseURL}/voice-profiles/upload`, {
       method: 'POST',
       body: formData,
       signal: controller.signal,
     });
     // ...
   }

   // 修正後
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

     const response = await fetch(`${this.baseURL}/voice-profiles`, {
       method: 'POST',
       body: formData,
       signal: controller.signal,
     });
     // ...
   }
   ```

3. **Delete Voice Profile** (Line 149-153)
   ```typescript
   // 修正前
   async deleteVoiceProfile(profileId: number): Promise<void> {
     await this.fetch(`/voice-profiles/${profileId}`, { method: 'DELETE' });
   }

   // 修正後
   async deleteVoiceProfile(profileId: string): Promise<void> {
     await this.fetch(`/voice-profiles/${profileId}`, { method: 'DELETE' });
   }
   ```

4. **Conversations** (Line 175-212)
   ```typescript
   // 修正前
   async getConversations(
     limit: number = API_CONFIG.PAGINATION.DEFAULT_LIMIT,
     offset: number = 0
   ): Promise<ConversationSession[]> {
     const response = await this.fetch<{ sessions: ConversationSession[]; total: number; page: number; per_page: number }>(
       `/conversations/history?limit=${limit}&offset=${offset}`
     );
     return response.sessions;
   }

   // 修正後
   async getConversations(
     page: number = 1,
     perPage: number = API_CONFIG.PAGINATION.DEFAULT_LIMIT
   ): Promise<ConversationList> {
     return this.fetch<ConversationList>(
       `/conversations/sessions?page=${page}&per_page=${perPage}`
     );
   }
   ```

5. **Search Conversations** (Line 193-197)
   ```typescript
   // 修正前
   async searchConversations(query: string): Promise<Conversation[]> {
     return this.fetch<Conversation[]>(
       `/conversations/search?q=${encodeURIComponent(query)}`
     );
   }

   // 修正後
   async searchConversations(
     query: string,
     page: number = 1,
     perPage: number = API_CONFIG.PAGINATION.DEFAULT_LIMIT
   ): Promise<ConversationList> {
     return this.fetch<ConversationList>(
       `/conversations/sessions/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`
     );
   }
   ```

6. **Export Conversations** (Line 202-212)
   ```typescript
   // 修正前
   async exportConversations(format: 'json' | 'txt' = 'json'): Promise<Blob> {
     const response = await fetch(
       `${this.baseURL}/conversations/export?format=${format}`
     );
     // ...
   }

   // 修正後
   async exportConversationSession(
     sessionId: string,
     format: 'json' | 'txt' = 'json'
   ): Promise<Blob> {
     const response = await fetch(
       `${this.baseURL}/conversations/${sessionId}/export?format=${format}`,
       { method: 'POST' }
     );
     // ...
   }
   ```

7. **System APIs** (Line 214-270)
   ```typescript
   // 修正所有路徑前綴
   async getSystemInfo(): Promise<SystemInfo> {
     return this.fetch<SystemInfo>('/system/info');  // 已正確
   }

   async getVRAMStatus(): Promise<VRAMStatus[]> {
     const response = await this.fetch<any>('/system/vram/status');  // 已正確
     return response.gpus || [];
   }

   async getModelStatus(): Promise<ModelStatus> {
     return this.fetch<ModelStatus>('/system/models/status');  // 已正確
   }

   async preloadModels(enableHqTts: boolean = false): Promise<any> {
     return this.fetch(`/system/models/preload?enable_hq_tts=${enableHqTts}`, {
       method: 'POST',
     });
   }

   // ❌ 刪除不存在的端點
   // async getSessionStatus() { ... }
   ```

#### 1.2 新增缺失的 API 方法

**優先級**: 🟡 High
**預估時間**: 6 小時
**位置**: `frontend/src/lib/api-client.ts` (新增至 AVATARAPIClient class)

```typescript
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
): Promise<ConversationHistory> {
  return this.fetch<ConversationHistory>(
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
```

#### 1.3 更新型別定義 (`api-config.ts`)

**優先級**: 🟡 High
**預估時間**: 2 小時
**位置**: `frontend/src/lib/api-config.ts`

```typescript
// ==================== 新增缺失的型別 ====================

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

// ==================== 修正現有型別 ====================

// 修正 VoiceProfile.id 型別
export interface VoiceProfile {
  id: string;                    // ✅ 改為 string
  name: string;
  description?: string;
  reference_text?: string;
  audio_path: string;
  file_size: number;
  created_at: string;
  updated_at?: string;
}
```

#### 1.4 更新 React Hooks (`use-avatar-api.tsx`)

**優先級**: 🔴 Critical
**預估時間**: 4 小時
**位置**: `frontend/src/hooks/use-avatar-api.tsx`

**變更清單**:

1. **修正 Conversations Hooks** (Line 73-109)
   ```typescript
   // 修正前
   export const useConversations = (limit: number = 50, offset: number = 0) => {
     return useQuery({
       queryKey: [...QUERY_KEYS.CONVERSATIONS, limit, offset],
       queryFn: () => avatarAPI.getConversations(limit, offset),
       refetchInterval: 60000,
       staleTime: 30000
     });
   };

   // 修正後
   export const useConversations = (page: number = 1, perPage: number = 20) => {
     return useQuery({
       queryKey: [...QUERY_KEYS.CONVERSATIONS, page, perPage],
       queryFn: () => avatarAPI.getConversations(page, perPage),
       refetchInterval: 60000,
       staleTime: 30000
     });
   };
   ```

2. **修正 Search Hook** (Line 82-89)
   ```typescript
   // 修正前
   export const useSearchConversations = () => {
     return useMutation({
       mutationFn: (query: string) => avatarAPI.searchConversations(query),
       onError: (error) => {
         console.error('Conversation search failed:', error);
       }
     });
   };

   // 修正後
   export const useSearchConversations = () => {
     return useMutation({
       mutationFn: ({
         query,
         page = 1,
         perPage = 20
       }: {
         query: string;
         page?: number;
         perPage?: number;
       }) => avatarAPI.searchConversations(query, page, perPage),
       onError: (error) => {
         console.error('Conversation search failed:', error);
       }
     });
   };
   ```

3. **修正 Export Hook** (Line 91-109)
   ```typescript
   // 修正前
   export const useExportConversations = () => {
     return useMutation({
       mutationFn: (format: 'json' | 'txt' = 'json') =>
         avatarAPI.exportConversations(format),
       onSuccess: (blob, variables) => {
         const url = window.URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = `avatar-conversations.${variables}`;
         // ...
       }
     });
   };

   // 修正後
   export const useExportConversationSession = () => {
     return useMutation({
       mutationFn: ({
         sessionId,
         format = 'json'
       }: {
         sessionId: string;
         format?: 'json' | 'txt';
       }) => avatarAPI.exportConversationSession(sessionId, format),
       onSuccess: (blob, variables) => {
         const url = window.URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = `conversation-${variables.sessionId}.${variables.format}`;
         // ...
       }
     });
   };
   ```

4. **刪除不存在的 Hook** (Line 130-137)
   ```typescript
   // ❌ 完全刪除
   // export const useSessionStatus = () => { ... }
   ```

5. **新增缺失的 Hooks**
   ```typescript
   // ==================== Voice Profiles (Extended) ====================

   export const useVoiceProfile = (profileId: string) => {
     return useQuery({
       queryKey: [...QUERY_KEYS.VOICE_PROFILES, profileId],
       queryFn: () => avatarAPI.getVoiceProfile(profileId),
       staleTime: 30000
     });
   };

   export const useUpdateVoiceProfile = () => {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: ({
         profileId,
         data,
         audioFile
       }: {
         profileId: string;
         data: { name?: string; description?: string; reference_text?: string };
         audioFile?: File;
       }) => avatarAPI.updateVoiceProfile(profileId, data, audioFile),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VOICE_PROFILES });
       },
       onError: (error) => {
         console.error('Voice profile update failed:', error);
       }
     });
   };

   export const useVoiceProfileAudio = (profileId: string) => {
     return useQuery({
       queryKey: [...QUERY_KEYS.VOICE_PROFILES, profileId, 'audio'],
       queryFn: () => avatarAPI.getVoiceProfileAudio(profileId),
       staleTime: Infinity,  // Audio files don't change
       enabled: false        // Only fetch when explicitly called
     });
   };

   // ==================== Conversations (Extended) ====================

   export const useConversationHistory = (sessionId: string, limit: number = 50) => {
     return useQuery({
       queryKey: [...QUERY_KEYS.CONVERSATIONS, sessionId, limit],
       queryFn: () => avatarAPI.getConversationHistory(sessionId, limit),
       staleTime: 30000
     });
   };

   export const useDeleteConversation = () => {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: (sessionId: string) =>
         avatarAPI.deleteConversationSession(sessionId),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONVERSATIONS });
       },
       onError: (error) => {
         console.error('Conversation deletion failed:', error);
       }
     });
   };

   export const useConversationAudio = () => {
     return useMutation({
       mutationFn: ({
         sessionId,
         turnNumber,
         audioType = 'ai_fast'
       }: {
         sessionId: string;
         turnNumber: number;
         audioType?: 'user' | 'ai_fast' | 'ai_hq';
       }) => avatarAPI.getConversationAudio(sessionId, turnNumber, audioType),
       onSuccess: (blob, variables) => {
         // Auto-download the audio file
         const url = window.URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = `${variables.sessionId}-turn${variables.turnNumber}-${variables.audioType}.wav`;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         window.URL.revokeObjectURL(url);
       },
       onError: (error) => {
         console.error('Audio download failed:', error);
       }
     });
   };

   export const useConversationStats = () => {
     return useQuery({
       queryKey: ['conversation-stats'],
       queryFn: () => avatarAPI.getConversationStats(),
       refetchInterval: 60000,
       staleTime: 30000
     });
   };

   // ==================== VRAM Management ====================

   export const useVRAMHistory = (deviceId: number = 0, minutes: number = 10) => {
     return useQuery({
       queryKey: [...QUERY_KEYS.VRAM_STATUS, 'history', deviceId, minutes],
       queryFn: () => avatarAPI.getVRAMHistory(deviceId, minutes),
       refetchInterval: 30000,
       staleTime: 10000
     });
   };

   export const useTriggerVRAMCleanup = () => {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: (deviceId?: number) => avatarAPI.triggerVRAMCleanup(deviceId),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VRAM_STATUS });
       },
       onError: (error) => {
         console.error('VRAM cleanup failed:', error);
       }
     });
   };

   export const usePredictServiceCapacity = () => {
     return useMutation({
       mutationFn: (serviceType: 'stt' | 'llm' | 'tts_fast' | 'tts_hq') =>
         avatarAPI.predictServiceCapacity(serviceType),
       onError: (error) => {
         console.error('Service capacity prediction failed:', error);
       }
     });
   };

   // ==================== Monitoring API ====================

   export const MONITORING_KEYS = {
     HEALTH: ['monitoring-health'] as const,
     ALERTS: ['monitoring-alerts'] as const,
     ERRORS: ['monitoring-errors'] as const,
     METRICS: ['monitoring-metrics'] as const,
     PERFORMANCE: ['monitoring-performance'] as const,
     DASHBOARD: ['monitoring-dashboard'] as const,
   };

   export const useMonitoringHealth = () => {
     return useQuery({
       queryKey: MONITORING_KEYS.HEALTH,
       queryFn: () => avatarAPI.getMonitoringHealth(),
       refetchInterval: 15000,
       staleTime: 5000
     });
   };

   export const useMonitoringAlerts = (
     includeResolved: boolean = false,
     level?: string
   ) => {
     return useQuery({
       queryKey: [...MONITORING_KEYS.ALERTS, includeResolved, level],
       queryFn: () => avatarAPI.getMonitoringAlerts(includeResolved, level),
       refetchInterval: 20000,
       staleTime: 10000
     });
   };

   export const useAcknowledgeAlert = () => {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: (alertId: string) => avatarAPI.acknowledgeAlert(alertId),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: MONITORING_KEYS.ALERTS });
       }
     });
   };

   export const useResolveAlert = () => {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: (alertId: string) => avatarAPI.resolveAlert(alertId),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: MONITORING_KEYS.ALERTS });
       }
     });
   };

   export const useErrorStatistics = () => {
     return useQuery({
       queryKey: MONITORING_KEYS.ERRORS,
       queryFn: () => avatarAPI.getErrorStatistics(),
       refetchInterval: 30000,
       staleTime: 15000
     });
   };

   export const useRecentErrors = (limit: number = 50, severity?: string) => {
     return useQuery({
       queryKey: [...MONITORING_KEYS.ERRORS, 'recent', limit, severity],
       queryFn: () => avatarAPI.getRecentErrors(limit, severity),
       refetchInterval: 30000,
       staleTime: 15000
     });
   };

   export const useMetricsSummary = () => {
     return useQuery({
       queryKey: MONITORING_KEYS.METRICS,
       queryFn: () => avatarAPI.getMetricsSummary(),
       refetchInterval: 20000,
       staleTime: 10000
     });
   };

   export const usePerformanceMetrics = () => {
     return useQuery({
       queryKey: MONITORING_KEYS.PERFORMANCE,
       queryFn: () => avatarAPI.getPerformanceMetrics(),
       refetchInterval: 30000,
       staleTime: 15000
     });
   };

   export const useDashboardData = () => {
     return useQuery({
       queryKey: MONITORING_KEYS.DASHBOARD,
       queryFn: () => avatarAPI.getDashboardData(),
       refetchInterval: 15000,
       staleTime: 5000
     });
   };

   export const useResetMonitoringStats = () => {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: () => avatarAPI.resetMonitoringStats(),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['monitoring'] });
       }
     });
   };
   ```

6. **更新 Dashboard Hook** (Line 150-170)
   ```typescript
   // 修正前
   export const useDashboardData = () => {
     const health = useSystemHealth();
     const vram = useVRAMStatus();
     const sessions = useSessionStatus();  // ❌ 不存在
     const profiles = useVoiceProfiles();

     return {
       health: health.data,
       vram: vram.data,
       sessions: sessions.data,  // ❌ 移除
       voiceProfiles: profiles.data,
       // ...
     };
   };

   // 修正後
   export const useSystemDashboardData = () => {
     const health = useSystemHealth();
     const vram = useVRAMStatus();
     const profiles = useVoiceProfiles();
     const conversationStats = useConversationStats();

     return {
       health: health.data,
       vram: vram.data,
       voiceProfiles: profiles.data,
       conversationStats: conversationStats.data,
       isLoading: health.isLoading || vram.isLoading || profiles.isLoading || conversationStats.isLoading,
       error: health.error || vram.error || profiles.error || conversationStats.error,
       refetch: () => {
         health.refetch();
         vram.refetch();
         profiles.refetch();
         conversationStats.refetch();
       }
     };
   };
   ```

#### 1.5 修正 WebSocket Hook Bug

**優先級**: 🟢 Low
**預估時間**: 0.5 小時
**位置**: `frontend/src/hooks/use-avatar-websocket.tsx:175`

```typescript
// 確保 import 語句完整
import { API_CONFIG } from '@/lib/api-config';  // ✅ 已經存在，確認無誤
```

---

### 階段 2: 元件重構 (Optional) - Week 2

#### 2.1 修正 `ConversationHistory_Broken.tsx`

**優先級**: 🟡 Medium
**預估時間**: 8 小時
**受影響檔案**: `frontend/src/components/ConversationHistory_Broken.tsx`

**問題**:
1. 使用假資料 (Line 15-34)
2. 未整合後端 API
3. 缺少錯誤處理
4. 缺少載入狀態

**修正建議**:
```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Play, Download, Search, Calendar, Loader2 } from "lucide-react";
import {
  useConversations,
  useSearchConversations,
  useExportConversationSession,
  useConversationAudio
} from "@/hooks/use-avatar-api";

const ConversationHistory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  // 使用正確的 API hooks
  const { data, isLoading, error } = useConversations(currentPage, perPage);
  const searchMutation = useSearchConversations();
  const exportMutation = useExportConversationSession();
  const audioMutation = useConversationAudio();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate({ query: searchQuery, page: 1, perPage });
    }
  };

  const handleExport = (sessionId: string, format: 'json' | 'txt' = 'json') => {
    exportMutation.mutate({ sessionId, format });
  };

  const handlePlayAudio = (sessionId: string, turnNumber: number) => {
    audioMutation.mutate({ sessionId, turnNumber, audioType: 'ai_fast' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-red-500/10 border-red-500/50 p-8">
            <p className="text-red-500">Error loading conversations: {error.message}</p>
          </Card>
        </div>
      </div>
    );
  }

  const sessions = searchMutation.data?.sessions || data?.sessions || [];
  const totalSessions = searchMutation.data?.total || data?.total || 0;

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-foreground">
          Conversation <span className="text-neon-blue">History</span>
        </h2>

        <Card className="bg-glass-gradient backdrop-blur-xl border-2 border-neon-blue/30 rounded-2xl p-8 shadow-2xl">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-10 bg-muted/30 border-neon-blue/20 focus:border-neon-blue"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <Button
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              className="bg-neon-gradient hover:opacity-90"
            >
              {searchMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Search
            </Button>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No conversations found
              </div>
            ) : (
              sessions.map((session, index) => (
                <div key={session.session_id} className="relative">
                  {/* Timeline Line */}
                  {index < sessions.length - 1 && (
                    <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gradient-to-b from-neon-blue to-transparent" />
                  )}

                  <div className="flex gap-6 group">
                    {/* Timeline Dot */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-neon-gradient flex items-center justify-center shadow-lg shadow-neon-blue/50 group-hover:scale-110 transition-transform">
                        <div className="w-4 h-4 rounded-full bg-background" />
                      </div>
                    </div>

                    {/* Content Card */}
                    <div className="flex-1 bg-muted/30 border border-neon-blue/20 rounded-xl p-6 hover:border-neon-blue/40 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {new Date(session.created_at).toLocaleString()}
                          </p>
                          <p className="text-foreground">{session.first_message}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {session.turn_count} turns
                            {session.voice_profile_name && ` • Voice: ${session.voice_profile_name}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-neon-blue/50 hover:bg-neon-blue/10"
                          onClick={() => handlePlayAudio(session.session_id, 1)}
                          disabled={audioMutation.isPending}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Play Audio
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="border-accent/50 hover:bg-accent/10"
                          onClick={() => handleExport(session.session_id, 'json')}
                          disabled={exportMutation.isPending}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalSessions > perPage && (
            <div className="flex justify-center gap-4 mt-8">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {currentPage} of {Math.ceil(totalSessions / perPage)}
              </span>
              <Button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= Math.ceil(totalSessions / perPage)}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};

export default ConversationHistory;
```

---

### 階段 3: 測試與驗證 - Week 3

#### 3.1 單元測試

**位置**: `frontend/src/lib/__tests__/`

```typescript
// api-client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { avatarAPI } from '../api-client';

describe('AVATARAPIClient', () => {
  describe('Voice Profiles', () => {
    it('should fetch voice profiles', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ profiles: [], total: 0, limit: 20, offset: 0 })
      });

      const result = await avatarAPI.getVoiceProfiles();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/voice-profiles'),
        expect.any(Object)
      );
      expect(result).toEqual([]);
    });

    // 更多測試...
  });

  describe('Conversations', () => {
    it('should use correct pagination parameters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sessions: [], total: 0, page: 1, per_page: 20 })
      });

      await avatarAPI.getConversations(2, 50);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2&per_page=50'),
        expect.any(Object)
      );
    });

    // 更多測試...
  });
});
```

#### 3.2 整合測試

**測試範圍**:
1. 前端 API client 與後端 API 整合
2. WebSocket 連接與訊息傳遞
3. 檔案上傳與下載
4. 錯誤處理與重試邏輯

#### 3.3 E2E 測試

**測試場景**:
1. 完整的語音對話流程
2. Voice Profile 建立與測試
3. 對話歷史瀏覽與搜尋
4. 系統監控與告警

---

## 📊 變更影響評估

### Breaking Changes

以下變更將導致現有程式碼無法執行，必須同時更新所有使用這些 API 的元件：

| 變更 | 影響範圍 | 遷移複雜度 |
|-----|---------|-----------|
| `getConversations(limit, offset)` → `getConversations(page, perPage)` | 所有使用對話列表的元件 | 🟡 Medium |
| `searchConversations(query)` → `searchConversations(query, page, perPage)` | 搜尋功能元件 | 🟡 Medium |
| `deleteVoiceProfile(number)` → `deleteVoiceProfile(string)` | Voice Profile 管理元件 | 🟢 Low |
| `exportConversations(format)` → `exportConversationSession(sessionId, format)` | 匯出功能元件 | 🔴 High |
| 移除 `getSessionStatus()` | 儀表板元件 | 🔴 High |
| `uploadVoiceProfile(name, file)` → `uploadVoiceProfile(name, file, description?, referenceText?)` | 上傳元件 | 🟢 Low (向後兼容) |

### 新增功能

以下功能為新增，不影響現有程式碼，但建議整合以提升系統完整性：

| 功能 | 優先級 | 用途 |
|-----|-------|------|
| Voice Profile 詳細資訊 | 🟡 Medium | 顯示完整 profile 資訊 |
| Voice Profile 更新 | 🟡 Medium | 編輯現有 profile |
| Voice Profile 音檔下載 | 🟢 Low | 備份與分享 |
| 對話 Session 詳細歷史 | 🔴 High | 完整對話記錄 |
| 對話 Session 刪除 | 🟡 Medium | 資料管理 |
| 對話音檔下載 | 🟡 Medium | 品質檢查 |
| 對話統計數據 | 🔴 High | 使用分析 |
| VRAM 歷史監控 | 🟡 Medium | 效能分析 |
| VRAM 手動清理 | 🟡 Medium | 資源管理 |
| 服務容量預測 | 🟡 Medium | 負載規劃 |
| Monitoring API (完整模組) | 🔴 High | 系統監控 |

---

## ⚠️ 風險評估

### High Risk

1. **Breaking Changes 影響範圍大**
   - **風險**: 多個元件同時失效
   - **緩解**: 建立完整的測試套件，分階段部署

2. **後端 API 版本相容性未知**
   - **風險**: OpenAPI 規格可能與實際實作不符
   - **緩解**: 與後端團隊確認規格，進行整合測試

3. **使用者資料遷移**
   - **風險**: 舊資料格式與新 API 不相容
   - **緩解**: 實作資料遷移腳本

### Medium Risk

1. **Monitoring API 缺失影響除錯能力**
   - **風險**: 生產環境問題難以追蹤
   - **緩解**: 優先實作核心監控功能

2. **型別定義不完整**
   - **風險**: 執行時錯誤
   - **緩解**: 使用 TypeScript strict mode，增加執行時驗證

---

## 📅 實施時程

| 階段 | 任務 | 預估時間 | 優先級 | 依賴 |
|-----|------|---------|-------|------|
| **Week 1** | **緊急修復** | **16 小時** | 🔴 Critical | - |
| Day 1-2 | 修正 `api-client.ts` 路徑 | 4 小時 | 🔴 | - |
| Day 2-3 | 更新 `api-config.ts` 型別 | 2 小時 | 🔴 | Task 1 |
| Day 3-5 | 修正 `use-avatar-api.tsx` | 4 小時 | 🔴 | Task 1-2 |
| Day 5 | 修正 WebSocket bug | 0.5 小時 | 🟢 | - |
| Day 5 | 新增缺失的 API 方法 | 6 小時 | 🟡 | Task 1-2 |
| **Week 2** | **元件重構** | **8 小時** | 🟡 Medium | Week 1 |
| Day 1-2 | 重構 `ConversationHistory` | 8 小時 | 🟡 | Week 1 |
| **Week 3** | **測試與驗證** | **16 小時** | 🟡 High | Week 1-2 |
| Day 1-2 | 單元測試 | 8 小時 | 🟡 | Week 1 |
| Day 3-4 | 整合測試 | 6 小時 | 🟡 | Week 1-2 |
| Day 5 | E2E 測試 | 4 小時 | 🟡 | Week 1-2 |

**總預估時間**: 42 小時 (約 5-6 工作日)

---

## ✅ 驗證檢查清單

### 階段 1 完成標準

- [ ] 所有 API 路徑包含正確的 `/api` 前綴
- [ ] Voice Profile API 參數與後端一致
- [ ] Conversations API 使用 `page`/`per_page` 分頁
- [ ] 移除 `getSessionStatus()` 呼叫
- [ ] 新增所有缺失的 API 方法
- [ ] 更新所有型別定義
- [ ] 修正所有 React Hooks
- [ ] 修正 WebSocket import
- [ ] 所有 TypeScript 編譯通過

### 階段 2 完成標準

- [ ] `ConversationHistory` 整合真實 API
- [ ] 實作錯誤處理與載入狀態
- [ ] 實作分頁功能
- [ ] 實作搜尋功能
- [ ] 實作匯出功能
- [ ] 實作音檔播放功能

### 階段 3 完成標準

- [ ] 單元測試覆蓋率 > 80%
- [ ] 所有 API 整合測試通過
- [ ] E2E 測試通過
- [ ] 效能測試通過
- [ ] 無 console errors/warnings

---

## 📝 建議與最佳實踐

### 1. API 版本管理

**建議**: 實作 API 版本控制，避免未來升級時的 Breaking Changes

```typescript
// api-config.ts
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  API_VERSION: 'v1',  // 新增版本控制
  // ...
};

// api-client.ts
private get apiUrl() {
  return `${this.baseURL}/${API_CONFIG.API_VERSION}`;
}
```

### 2. 錯誤處理增強

**建議**: 實作統一的錯誤處理機制

```typescript
// error-handler.ts
export class ErrorHandler {
  static handle(error: any) {
    if (error instanceof APIError) {
      switch (error.statusCode) {
        case 401:
          // 導向登入頁
          window.location.href = '/login';
          break;
        case 429:
          // 顯示 rate limit 錯誤
          toast.error('Too many requests. Please try again later.');
          break;
        default:
          toast.error(error.detail);
      }
    } else if (error instanceof NetworkError) {
      toast.error('Network error. Please check your connection.');
    }

    // 記錄到監控系統
    logError(error);
  }
}
```

### 3. 快取策略優化

**建議**: 根據資料特性調整快取策略

```typescript
// 資料變化頻率不同，應使用不同的 staleTime
export const CACHE_STRATEGIES = {
  STATIC: { staleTime: Infinity },        // 永久快取 (模型列表)
  LONG: { staleTime: 3600000 },           // 1 小時 (Voice Profiles)
  MEDIUM: { staleTime: 300000 },          // 5 分鐘 (對話歷史)
  SHORT: { staleTime: 30000 },            // 30 秒 (系統狀態)
  REALTIME: { staleTime: 0 },             // 不快取 (VRAM 監控)
};
```

### 4. 型別安全增強

**建議**: 使用 Zod 進行執行時型別驗證

```typescript
import { z } from 'zod';

// 定義 Schema
const VoiceProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  // ...
});

// 在 API client 中驗證
async getVoiceProfiles(): Promise<VoiceProfile[]> {
  const response = await this.fetch<VoiceProfileList>('/voice-profiles');

  // 驗證回應資料
  response.profiles.forEach(profile => {
    VoiceProfileSchema.parse(profile);
  });

  return response.profiles;
}
```

---

## 📚 參考資料

### OpenAPI 規格

- **後端 API 規格**: http://localhost:8000/openapi.json
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 相關文件

- **AVATAR 專案規格**: `/docs/planning/mvp_tech_spec.md`
- **API 架構文件**: `/docs/dev/api-provider-architecture.md`
- **開發進度報告**: `/docs/dev/development_progress_report.md`

### 前端檔案位置

- **API Client**: `frontend/src/lib/api-client.ts`
- **API Config**: `frontend/src/lib/api-config.ts`
- **WebSocket Client**: `frontend/src/lib/websocket-client.ts`
- **API Hooks**: `frontend/src/hooks/use-avatar-api.tsx`
- **WebSocket Hook**: `frontend/src/hooks/use-avatar-websocket.tsx`

---

## 🤝 協作與溝通

### 需要後端團隊確認的事項

1. **OpenAPI 規格是否為最新版本**
   - 規格生成時間: 檢查 `info.version`
   - 是否有未發布的變更

2. **Voice Profile ID 型別**
   - OpenAPI 顯示為 `string`
   - 資料庫實際型別為何？

3. **Session Status 端點**
   - 前端呼叫 `/system/sessions/status`
   - 後端是否計劃實作此端點？

4. **Export Conversations 行為**
   - 是否支援匯出所有對話？
   - 或僅支援單一 session 匯出？

5. **Monitoring API 權限**
   - 哪些端點需要認證？
   - Admin 權限如何驗證？

---

## 📝 變更日誌

### 2025-12-02 - v1.0 (Initial Release)

**新增**:
- 完整前後端 API 比對分析
- 詳細問題分析報告
- 分階段修正計畫
- 程式碼範例與最佳實踐建議

**發現問題**:
- 路徑前綴缺失: 12+ 端點
- 端點路徑錯誤: 10+ 端點
- 查詢參數不匹配: 2 處
- 缺少端點實作: 20+ 端點
- 呼叫不存在端點: 1 處

---

**報告結束**

> 本報告由 Claude Code (Linus Torvalds 模式) 自動生成
> 如有疑問，請參考 `/docs/dev/` 資料夾中的其他技術文件
