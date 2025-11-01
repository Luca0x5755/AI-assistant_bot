# 整合性架構與設計文件 (Unified Architecture & Design Document) - AI 語音助手機器人

---

**文件版本 (Document Version):** `v1.0`
**最後更新 (Last Updated):** `2025-11-01`
**主要作者 (Lead Author):** `[技術架構師]`
**審核者 (Reviewers):** `[架構委員會, 核心開發團隊]`
**狀態 (Status):** `已批准 (Approved)`

---

## 目錄 (Table of Contents)

- [第 1 部分:架構總覽 (Architecture Overview)](#第-1-部分架構總覽-architecture-overview)
  - [1.1 架構原則與哲學](#11-架構原則與哲學)
  - [1.2 C4 模型:視覺化架構](#12-c4-模型視覺化架構)
  - [1.3 DDD 戰略設計](#13-ddd-戰略設計-strategic-ddd)
  - [1.4 Clean Architecture 分層](#14-clean-architecture-分層)
  - [1.5 技術選型與決策](#15-技術選型與決策)
- [第 2 部分:系統設計 (System Design)](#第-2-部分系統設計-system-design)
  - [2.1 核心流程設計](#21-核心流程設計)
  - [2.2 模型資源管理策略](#22-模型資源管理策略-vram-orchestration)
  - [2.3 數據架構](#23-數據架構-data-architecture)
  - [2.4 API 設計概覽](#24-api-設計概覽)
- [第 3 部分:部署與基礎設施](#第-3-部分部署與基礎設施-deployment--infrastructure)
  - [3.1 部署架構](#31-部署架構-deployment-architecture)
  - [3.2 Docker Compose 配置](#32-docker-compose-配置)
  - [3.3 資源規劃](#33-資源規劃-hardware-resource-allocation)
- [第 4 部分:跨領域考量](#第-4-部分跨領域考量-cross-cutting-concerns)
  - [4.1 可觀測性](#41-可觀測性-observability)
  - [4.2 安全性與隱私](#42-安全性與隱私-security--privacy)
  - [4.3 錯誤處理與韌性](#43-錯誤處理與韌性-error-handling--resilience)
- [第 5 部分:風險與緩解](#第-5-部分風險與緩解-risks--mitigation)
- [第 6 部分:擴展路線圖](#第-6-部分擴展路線圖-scalability-roadmap)
- [附錄](#附錄-appendix)

---

**目的**: 本文件旨在將業務需求轉化為一個完整、內聚的技術藍圖。它從高層次的系統架構（Structure）開始,逐步深入到具體的模組級實現細節（Design）,確保系統的穩固性與可維護性。

---

## 第 1 部分:架構總覽 (Architecture Overview)

### 1.1 架構原則與哲學

本系統遵循以下核心原則,確保在資源受限的單機環境下實現高性能、低延遲的 AI 對話助手:

#### 1.1.1 「先快後美」(Fast then Beautiful)

> **核心理念**: 優先保證用戶體驗流暢度,再追求品質完美

*   **快檔優先**: 使用輕量級 TTS（F5-TTS）先響應,確保 E2E ≤3秒
*   **高質補償**: 後台生成高品質 TTS（CosyVoice3）,覆蓋快檔音頻
*   **權衡**: 接受品質與延遲的短期妥協,換取長期用戶留存

#### 1.1.2 「按需載入」(On-Demand Loading)

> **核心理念**: VRAM 是稀缺資源,模型載入應該動態且智能

*   **常駐模型**: LLM（vLLM）+ ASR（faster-whisper on CPU）
*   **按需模型**: HQ-TTS（使用時載入,閒置時卸載）
*   **熱度驅逐**: 使用 LRU 策略管理模型生命週期

#### 1.1.3 「切句與佇列」(Chunking & Queuing)

> **核心理念**: 長文本切分,平滑延遲感知

*   **文本切句**: 按標點分句（10-15 字/句）
*   **邊生邊播**: TTS 合成一句即播一句,降低首音延遲
*   **任務佇列**: Redis 管理 TTS 任務,避免請求堆積

#### 1.1.4 「異步處理」(Asynchronous Processing)

> **核心理念**: 非關鍵路徑的操作不應阻塞主流程

*   **語音分析**: 在 CPU 異步執行,不佔用 GPU
*   **音檔存儲**: 異步寫入 MinIO,不阻塞響應
*   **監控打點**: 異步推送 Prometheus metrics

---

### 1.2 C4 模型:視覺化架構

#### L1 - 系統情境圖 (System Context Diagram)

```mermaid
graph TB
    User[使用者<br/>透過瀏覽器與系統互動]
    System[AI 語音助手系統<br/>AVATAR]
    HuggingFace[HuggingFace<br/>模型下載服務]

    User -->|WebSocket<br/>語音輸入/文字輸出| System
    System -->|HTTPS<br/>模型下載<br/>僅初始化時| HuggingFace

    style System fill:#4A90E2,stroke:#2E5C8A,stroke-width:3px,color:#fff
    style User fill:#7ED321,stroke:#5FA319,stroke-width:2px
    style HuggingFace fill:#F5A623,stroke:#D68910,stroke-width:2px
```

**系統邊界說明**:
*   **使用者**: 透過現代瀏覽器（Chrome/Edge/Firefox）訪問 Web 介面
*   **AVATAR 系統**: 本地部署的 AI 對話助手,所有計算在地端完成
*   **外部依賴**: 僅初始化時需要網路連線下載模型,運行時完全離線

---

#### L2 - 容器圖 (Container Diagram)

```mermaid
graph TB
    subgraph "用戶端 (Client)"
        WebApp[Web Application<br/>React + TypeScript<br/>Vite]
    end

    subgraph "後端服務 (Backend Services)"
        Orchestrator[Orchestrator API<br/>FastAPI + WebSocket<br/>Python 3.11]
        vLLM[vLLM Service<br/>Qwen2.5-7B-AWQ<br/>OpenAI-compatible API]
        ASR[ASR Service<br/>faster-whisper<br/>CT2 + VAD]
        TTS_Fast[Fast TTS Service<br/>F5-TTS<br/>Non-autoregressive]
        TTS_HQ[HQ TTS Service<br/>CosyVoice3<br/>Zero-shot Cloning]
        Prosody[Prosody Analyzer<br/>openSMILE + Parselmouth<br/>CPU-based]
    end

    subgraph "數據層 (Data Layer)"
        MinIO[MinIO<br/>Object Storage<br/>音檔存儲]
        PostgreSQL[PostgreSQL<br/>Relational DB<br/>特徵/分數/日誌]
        Redis[Redis<br/>Cache + Queue<br/>任務佇列/會話狀態]
    end

    subgraph "監控層 (Monitoring)"
        Prometheus[Prometheus<br/>Metrics 收集]
        Grafana[Grafana<br/>可視化儀表板]
    end

    WebApp -->|WSS| Orchestrator
    Orchestrator -->|HTTP| vLLM
    Orchestrator -->|gRPC/HTTP| ASR
    Orchestrator -->|gRPC/HTTP| TTS_Fast
    Orchestrator -->|gRPC/HTTP| TTS_HQ
    Orchestrator -->|Async Task| Prosody

    Orchestrator -->|Store Audio| MinIO
    Orchestrator -->|R/W Metadata| PostgreSQL
    Orchestrator -->|Cache/Queue| Redis

    Orchestrator -->|Push Metrics| Prometheus
    Prometheus -->|Scrape| vLLM
    Prometheus -->|Scrape| ASR
    Prometheus -->|Scrape| TTS_Fast
    Grafana -->|Query| Prometheus

    style Orchestrator fill:#4A90E2,stroke:#2E5C8A,stroke-width:3px,color:#fff
    style vLLM fill:#E94B3C,stroke:#C73A2E,stroke-width:2px,color:#fff
    style TTS_HQ fill:#BD10E0,stroke:#9012FE,stroke-width:2px,color:#fff
```

**容器職責說明**:

| 容器 | 職責 | 技術棧 | 部署模式 |
|:---|:---|:---|:---|
| **Web Application** | 前端介面,處理用戶交互、音頻錄製/播放、WebSocket 通訊 | React 18 + Vite + TypeScript | Nginx 靜態托管 |
| **Orchestrator API** | 核心編排層,管理 STT→LLM→TTS 流程,WebSocket 連接管理 | FastAPI + uvicorn + asyncio | Docker Container |
| **vLLM Service** | LLM 推理引擎,提供 OpenAI 兼容 API,支持流式輸出 | vLLM + Qwen2.5-7B (INT4/AWQ) | Docker + GPU |
| **ASR Service** | 語音識別,支持流式與 VAD,主要跑 CPU | faster-whisper (CT2) + Silero VAD | Docker + CPU |
| **Fast TTS Service** | 快速語音合成,非自回歸架構,低延遲優先 | F5-TTS / MeloTTS | Docker + GPU (按需) |
| **HQ TTS Service** | 高品質語音合成,零樣本克隆,按需載入 | CosyVoice3 / XTTS v2 | Docker + GPU (按需) |
| **Prosody Analyzer** | 語音韻律分析,CPU 異步處理 | openSMILE + Parselmouth | Docker + CPU |
| **MinIO** | S3 兼容對象存儲,存放音頻文件 | MinIO OSS | Docker |
| **PostgreSQL** | 關係型數據庫,存放會話/分數/特徵 | PostgreSQL 16 | Docker |
| **Redis** | 緩存 + 任務佇列 + 會話狀態 | Redis 7 | Docker |
| **Prometheus + Grafana** | 監控與可視化 | Prometheus + Grafana | Docker |

---

#### L3 - 元件圖 (Component Diagram) - Orchestrator 內部

```mermaid
graph TD
    subgraph "Orchestrator API Components"
        WSHandler[WebSocket Handler<br/>管理連接與消息路由]
        SessionMgr[Session Manager<br/>會話狀態管理]
        STTPipeline[STT Pipeline<br/>音頻切片與轉錄]
        LLMPipeline[LLM Pipeline<br/>對話生成與流式]
        TTSPipeline[TTS Pipeline<br/>雙檔合成與佇列]
        ProsodyWorker[Prosody Worker<br/>異步分析任務]
        StorageService[Storage Service<br/>音檔上傳/檢索]
        MetricsCollector[Metrics Collector<br/>性能指標收集]
    end

    WSHandler --> SessionMgr
    WSHandler --> STTPipeline
    STTPipeline --> LLMPipeline
    LLMPipeline --> TTSPipeline
    STTPipeline --> ProsodyWorker
    TTSPipeline --> StorageService

    SessionMgr -.->|Redis| Cache
    StorageService -.->|MinIO| ObjectStore
    ProsodyWorker -.->|PostgreSQL| Database
    MetricsCollector -.->|Prometheus| Monitor

    style WSHandler fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff
    style LLMPipeline fill:#E94B3C,stroke:#C73A2E,stroke-width:2px,color:#fff
    style TTSPipeline fill:#BD10E0,stroke:#9012FE,stroke-width:2px,color:#fff
```

---

### 1.3 DDD 戰略設計 (Strategic DDD)

#### 1.3.1 通用語言 (Ubiquitous Language)

| 術語 | 領域定義 | 技術映射 |
|:---|:---|:---|
| **Session** | 一次完整的對話會話,包含多個 Turn | `Session` Entity |
| **Turn** | 一輪用戶輸入與 AI 響應 | `ConversationTurn` Value Object |
| **Transcription** | 語音轉文字的結果 | `Transcription` Entity |
| **VoiceProfile** | 用戶上傳的聲音樣本及其特徵 | `VoiceProfile` Aggregate |
| **ProsodyScore** | 語音韻律分析的量化分數 | `ProsodyScore` Value Object |
| **TTSTask** | TTS 合成任務,包含模式（fast/hq） | `TTSTask` Entity |
| **AudioChunk** | 音頻片段,用於流式處理 | `AudioChunk` Value Object |

#### 1.3.2 限界上下文 (Bounded Contexts)

```mermaid
graph LR
    subgraph "Conversation Context<br/>對話上下文"
        Session
        Turn
        Message
    end

    subgraph "Speech Context<br/>語音上下文"
        Transcription
        VoiceProfile
        AudioFile
    end

    subgraph "Analysis Context<br/>分析上下文"
        ProsodyScore
        VoiceFeature
        AnalysisReport
    end

    subgraph "Synthesis Context<br/>合成上下文"
        TTSTask
        SynthesizedAudio
        VoiceModel
    end

    Session -->|has many| Turn
    Turn -->|references| Transcription
    Turn -->|references| SynthesizedAudio
    Transcription -->|analyzed by| ProsodyScore
    VoiceProfile -->|used in| TTSTask
    TTSTask -->|produces| SynthesizedAudio

    style Session fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff
    style VoiceProfile fill:#BD10E0,stroke:#9012FE,stroke-width:2px,color:#fff
```

**上下文關係**:
*   **Conversation ↔ Speech**: 通過 `Turn` 聚合根連接
*   **Speech ↔ Analysis**: 通過事件驅動（`TranscriptionCompleted` → `ProsodyAnalysisRequested`）
*   **Speech ↔ Synthesis**: 通過 `VoiceProfile` 共享實體

---

### 1.4 Clean Architecture 分層

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  (FastAPI Routes, WebSocket Handlers, Pydantic Schemas)     │
└───────────────────────────┬─────────────────────────────────┘
                            │ depends on
┌───────────────────────────▼─────────────────────────────────┐
│                     Application Layer                        │
│   (Use Cases, Application Services, DTOs)                   │
│   - StartConversationUseCase                                │
│   - ProcessVoiceInputUseCase                                │
│   - GenerateResponseUseCase                                 │
│   - SynthesizeSpeechUseCase                                 │
└───────────────────────────┬─────────────────────────────────┘
                            │ depends on
┌───────────────────────────▼─────────────────────────────────┐
│                       Domain Layer                           │
│   (Entities, Value Objects, Domain Services, Interfaces)    │
│   - Session, Turn, Transcription, VoiceProfile              │
│   - ProsodyScore (Value Object)                             │
│   - ISTTService, ITTSService, ILLMService (Interfaces)      │
└───────────────────────────┬─────────────────────────────────┘
                            │ implemented by
┌───────────────────────────▼─────────────────────────────────┐
│                    Infrastructure Layer                      │
│   (External Service Adapters, Repositories, DB/Storage)     │
│   - FasterWhisperAdapter (implements ISTTService)           │
│   - vLLMAdapter (implements ILLMService)                    │
│   - F5TTSAdapter, CosyVoiceAdapter (implements ITTSService) │
│   - PostgreSQLRepository, MinIOStorage                      │
└─────────────────────────────────────────────────────────────┘
```

**依賴規則**:
*   外層依賴內層,內層不依賴外層
*   Domain Layer 不依賴任何框架
*   Infrastructure Layer 實現 Domain Layer 定義的接口

---

### 1.5 技術選型與決策

#### 1.5.1 技術選型原則

1.  **地端優先**: 所有模型必須可本地運行,拒絕雲端 API
2.  **性能導向**: 優先選擇推理速度快、資源佔用低的方案
3.  **社群成熟度**: 選擇有活躍社群與豐富文檔的技術
4.  **量化優先**: 使用 INT4/FP8 量化減少 VRAM 佔用

#### 1.5.2 核心技術棧

| 分層/領域 | 選用技術 | 選擇理由 | 備選方案 | ADR |
|:---|:---|:---|:---|:---|
| **後端框架** | FastAPI + uvicorn | 異步支持、WebSocket 原生、自動 OpenAPI 文檔 | Flask (同步),Sanic (文檔較少) | ADR-001 |
| **LLM 推理** | vLLM + Qwen2.5-7B-AWQ | PagedAttention、Continuous Batching、繁中能力強 | llama.cpp (推理慢),TensorRT-LLM (部署複雜) | ADR-002 |
| **STT 引擎** | faster-whisper (CT2) + Silero VAD | INT8 量化、流式支持、CPU 友好 | Whisper.cpp (功能較少),Vosk (準確率較低) | ADR-003 |
| **TTS 快檔** | F5-TTS | 非自回歸、啟動快、延遲低 | MeloTTS (音質略差),Piper (缺乏克隆) | ADR-004 |
| **TTS 高質** | CosyVoice3 | 零樣本克隆、台式口音自然、情緒還原 | XTTS v2 (速度慢),GPT-SoVITS (部署複雜) | ADR-005 |
| **語音分析** | openSMILE + Parselmouth | 可解釋韻律特徵、CPU 執行、輕量級 | Pyannote (需 GPU),SpeechBrain (過重) | ADR-006 |
| **前端框架** | React 18 + Vite + TS | 開發效率、生態成熟、TypeScript 類型安全 | Vue 3 (團隊經驗少),Svelte (生態較小) | ADR-007 |
| **數據庫** | PostgreSQL 16 | JSONB 支持、穩定、ACID 保證 | MySQL (JSONB 支持弱),MongoDB (需強事務) | ADR-008 |
| **對象存儲** | MinIO | S3 兼容、本地部署、輕量級 | SeaweedFS (社群小),Ceph (過重) | ADR-009 |
| **緩存/佇列** | Redis 7 | 高性能、數據結構豐富、成熟穩定 | Memcached (功能單一),RabbitMQ (複雜度高) | ADR-010 |
| **容器編排** | Docker Compose | 單機部署簡單、配置清晰、易調試 | K8s (過度設計),Nomad (生態較小) | ADR-011 |
| **監控** | Prometheus + Grafana | CNCF 標準、社群豐富、避免廠商鎖定 | Datadog (商業),Zabbix (配置複雜) | ADR-012 |

---

## 第 2 部分:系統設計 (System Design)

### 2.1 核心流程設計

#### 2.1.1 端到端對話流程 (E2E Conversation Flow)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant WS as WebSocket Handler
    participant STT as ASR Service
    participant LLM as vLLM Service
    participant TTS_F as Fast TTS
    participant TTS_H as HQ TTS
    participant DB as PostgreSQL
    participant S3 as MinIO
    participant PA as Prosody Analyzer

    U->>WS: 1. 點擊錄音按鈕
    WS->>U: 2. 開始接收音頻流 (WebSocket)

    loop 實時轉錄
        U->>WS: 3. 音頻 chunk (每 300ms)
        WS->>STT: 4. 轉發音頻 chunk
        STT->>STT: 5. VAD 檢測語音活動
        STT->>WS: 6. Partial transcription
        WS->>U: 7. 即時顯示轉錄文字
    end

    STT->>WS: 8. Final transcription "今天天氣真好"
    WS->>U: 9. 完整轉錄結果

    par 並行處理
        WS->>LLM: 10. 生成回應 (Stream)
        WS->>PA: 11. 異步語音分析
        WS->>S3: 12. 異步存儲音頻
    end

    LLM->>WS: 13. Token stream (逐字返回)
    WS->>U: 14. 顯示 AI 回應文字

    LLM->>WS: 15. 完整回應 "今天確實是個好天氣,適合出去走走"

    WS->>TTS_F: 16. 快檔合成 (優先)
    TTS_F->>TTS_F: 17. 文本切句 (10-15字/句)
    TTS_F->>WS: 18. 音頻 stream (邊生邊播)
    WS->>U: 19. 播放快檔音頻 (≤1.5s)

    WS->>TTS_H: 20. 排隊 HQ 合成 (後台)
    TTS_H->>TTS_H: 21. 按需載入模型 (5-10s)
    TTS_H->>WS: 22. HQ 音頻完成
    WS->>S3: 23. 存儲 HQ 音頻
    WS->>U: 24. 通知 "高品質音頻就緒"

    PA->>DB: 25. 存儲韻律分數
    DB->>WS: 26. 分析完成
    WS->>U: 27. 推送語音分析報告

    Note over U,PA: 總延遲目標: P95 ≤ 3.5s (步驟 1-19)
```

**關鍵延遲節點**:
*   **STT**: 每 chunk 處理 < 100ms,最終轉錄 < 600ms
*   **LLM TTFT**: < 600ms (首個 token)
*   **Fast TTS**: 首句合成 < 1.5s (P50)
*   **E2E 總延遲**: < 3.5s (P95)

---

#### 2.1.2 聲音克隆流程 (Voice Cloning Flow)

```mermaid
sequenceDiagram
    participant U as User
    participant API as Orchestrator
    participant S3 as MinIO
    participant TTS_H as HQ TTS Service
    participant DB as PostgreSQL

    U->>API: 1. 上傳音檔 (sample_voice.wav, 15s)
    API->>API: 2. 驗證格式與時長 (5-30s)

    alt 格式無效
        API->>U: 3a. 錯誤: 不支援的檔案格式
    else 格式有效
        API->>S3: 3b. 存儲原始音檔
        S3->>API: 4. 音檔 URL

        API->>TTS_H: 5. 提取聲音 embedding
        TTS_H->>TTS_H: 6. 載入 Speaker Encoder
        TTS_H->>API: 7. Voice embedding (256-dim vector)

        API->>DB: 8. 存儲 VoiceProfile
        Note over DB: profile_id, user_id,<br/>audio_url, embedding,<br/>metadata (duration, sr)

        API->>U: 9. 上傳成功 + profile_id

        U->>API: 10. 試聽克隆效果 "你好,這是測試"
        API->>TTS_H: 11. 合成請求 (profile_id, text)
        TTS_H->>TTS_H: 12. Zero-shot synthesis
        TTS_H->>API: 13. 測試音頻
        API->>U: 14. 播放試聽
    end
```

---

### 2.2 模型資源管理策略 (VRAM Orchestration)

#### 2.2.1 VRAM 分配方案

```
┌───────────────────────────────────────────────────────────────┐
│              RTX 4090 24GB VRAM 分配計畫                       │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  [LLM: vLLM + Qwen2.5-7B-AWQ]                                │
│  ├─ 模型權重: ~4GB (INT4 量化)                                │
│  ├─ KV Cache: 4-6GB (FP8, max_model_len=4096)                │
│  ├─ 推理 overhead: 1-2GB                                      │
│  └─ 小計: 9-12GB (常駐)                                       │
│                                                               │
│  [Fast TTS: F5-TTS]                                          │
│  ├─ 模型權重: ~500MB                                          │
│  ├─ 推理 buffer: ~500MB                                       │
│  └─ 小計: 1GB (按需短駐,使用後釋放)                            │
│                                                               │
│  [HQ TTS: CosyVoice3]                                        │
│  ├─ 模型權重: ~2GB                                            │
│  ├─ Speaker Encoder: ~200MB                                  │
│  ├─ 推理 buffer: 1-2GB                                        │
│  └─ 小計: 3-4GB (按需載入,LRU 驅逐)                            │
│                                                               │
│  [系統 Overhead]                                             │
│  └─ PyTorch/CUDA runtime: 1-2GB                              │
│                                                               │
│  余量 (Buffer): 5-8GB                                         │
│  └─ 用於並發會話、KV cache 擴展、短暫峰值                       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### 2.2.2 模型生命週期管理

```python
# 偽代碼示意
class ModelLifecycleManager:
    def __init__(self, vram_budget: int = 24_000):  # MB
        self.resident_models = {
            "llm": vLLMModel(budget=12_000),  # 常駐
            "asr": FasterWhisperModel(device="cpu"),  # CPU
        }
        self.on_demand_models = {
            "tts_fast": None,  # 按需載入
            "tts_hq": None,    # 按需載入
        }
        self.lru_cache = LRUCache(max_size=2)

    async def get_model(self, model_name: str):
        # 常駐模型直接返回
        if model_name in self.resident_models:
            return self.resident_models[model_name]

        # 按需模型: 檢查緩存
        if self.lru_cache.has(model_name):
            return self.lru_cache.get(model_name)

        # 需要載入: 先檢查 VRAM
        current_vram = self.get_current_vram_usage()
        required_vram = MODEL_VRAM_REQUIREMENTS[model_name]

        # 如果不夠,驅逐 LRU 模型
        while current_vram + required_vram > self.vram_budget:
            evicted = self.lru_cache.pop_lru()
            await evicted.unload()  # 卸載模型
            current_vram = self.get_current_vram_usage()

        # 載入模型
        model = await self.load_model(model_name)
        self.lru_cache.put(model_name, model)
        return model
```

---

### 2.3 數據架構 (Data Architecture)

#### 2.3.1 核心數據模型 (ER Diagram)

```mermaid
erDiagram
    SESSION ||--o{ CONVERSATION_TURN : contains
    CONVERSATION_TURN ||--|| TRANSCRIPTION : has
    CONVERSATION_TURN ||--|| SYNTHESIZED_AUDIO : has
    TRANSCRIPTION ||--|| PROSODY_SCORE : analyzed_by
    USER ||--o{ VOICE_PROFILE : uploads
    VOICE_PROFILE ||--o{ SYNTHESIZED_AUDIO : used_in

    SESSION {
        uuid session_id PK
        timestamp start_time
        timestamp end_time
        string status
        jsonb metadata
    }

    CONVERSATION_TURN {
        uuid turn_id PK
        uuid session_id FK
        int turn_number
        text user_input
        text ai_response
        timestamp created_at
    }

    TRANSCRIPTION {
        uuid transcription_id PK
        uuid turn_id FK
        text final_text
        jsonb partial_results
        float confidence
        float latency_ms
        string audio_url
    }

    PROSODY_SCORE {
        uuid score_id PK
        uuid transcription_id FK
        float confidence
        float stability
        float affability
        jsonb features
        timestamp analyzed_at
    }

    VOICE_PROFILE {
        uuid profile_id PK
        uuid user_id FK
        string name
        string audio_url
        vector embedding
        float duration_sec
        jsonb metadata
        timestamp created_at
    }

    SYNTHESIZED_AUDIO {
        uuid audio_id PK
        uuid turn_id FK
        uuid voice_profile_id FK
        string mode
        string audio_url
        float duration_sec
        float synthesis_time_ms
        timestamp created_at
    }
```

#### 2.3.2 PostgreSQL Schema 設計

```sql
-- 會話表
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('active', 'ended', 'error')),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_start_time (start_time)
);

-- 對話輪次表
CREATE TABLE conversation_turns (
    turn_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    turn_number INT NOT NULL,
    user_input TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, turn_number),
    INDEX idx_session_id (session_id)
);

-- 轉錄表
CREATE TABLE transcriptions (
    transcription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turn_id UUID NOT NULL REFERENCES conversation_turns(turn_id) ON DELETE CASCADE,
    final_text TEXT NOT NULL,
    partial_results JSONB,  -- 存儲中間轉錄結果
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    latency_ms FLOAT,
    audio_url TEXT NOT NULL,  -- MinIO URL
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_turn_id (turn_id)
);

-- 韻律分數表
CREATE TABLE prosody_scores (
    score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcription_id UUID NOT NULL REFERENCES transcriptions(transcription_id) ON DELETE CASCADE,
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    stability FLOAT NOT NULL CHECK (stability >= 0 AND stability <= 100),
    affability FLOAT NOT NULL CHECK (affability >= 0 AND affability <= 100),
    features JSONB NOT NULL,  -- {"f0_mean": 150, "jitter": 0.02, ...}
    analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_transcription_id (transcription_id)
);

-- 聲音檔案表
CREATE TABLE voice_profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,  -- 暫時可為 NULL (MVP 無用戶系統)
    name VARCHAR(255) NOT NULL,
    audio_url TEXT NOT NULL,
    embedding VECTOR(256),  -- pgvector 擴展支持向量搜索
    duration_sec FLOAT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_user_id (user_id)
);

-- 合成音頻表
CREATE TABLE synthesized_audios (
    audio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turn_id UUID NOT NULL REFERENCES conversation_turns(turn_id) ON DELETE CASCADE,
    voice_profile_id UUID REFERENCES voice_profiles(profile_id),
    mode VARCHAR(10) NOT NULL CHECK (mode IN ('fast', 'hq')),
    audio_url TEXT NOT NULL,
    duration_sec FLOAT NOT NULL,
    synthesis_time_ms FLOAT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_turn_id (turn_id),
    INDEX idx_mode (mode)
);

-- 系統日誌表 (用於審計與調試)
CREATE TABLE system_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(10) NOT NULL,  -- DEBUG, INFO, WARNING, ERROR
    message TEXT NOT NULL,
    trace_id UUID,  -- 用於分佈式追蹤
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_level (level),
    INDEX idx_trace_id (trace_id),
    INDEX idx_created_at (created_at)
);
```

#### 2.3.3 MinIO 存儲結構

```
minio://avatar-audio-bucket/
├── raw_inputs/              # 用戶原始錄音
│   ├── 2025/11/01/
│   │   ├── {session_id}_{turn_id}_{timestamp}.wav
│   │   └── ...
│   └── ...
├── voice_profiles/          # 聲音樣本
│   ├── {profile_id}/
│   │   ├── original.wav
│   │   └── metadata.json
│   └── ...
├── synthesized/             # 合成音頻
│   ├── fast/
│   │   ├── {turn_id}_fast_{timestamp}.wav
│   │   └── ...
│   └── hq/
│       ├── {turn_id}_hq_{timestamp}.wav
│       └── ...
└── backups/                 # 定期備份
    └── ...
```

**存儲策略**:
*   **生命週期**: 原始音頻保留 30 天,合成音頻保留 7 天
*   **壓縮**: 使用 Opus codec 壓縮長期存檔
*   **訪問控制**: 預簽名 URL,有效期 1 小時

---

### 2.4 API 設計概覽

#### 2.4.1 REST API 端點

| 端點 | 方法 | 描述 | Request | Response |
|:---|:---|:---|:---|:---|
| `/api/v1/sessions` | POST | 創建新會話 | `{}` | `{session_id, ws_url}` |
| `/api/v1/sessions/{id}` | GET | 獲取會話詳情 | - | `Session` |
| `/api/v1/sessions/{id}/turns` | GET | 獲取對話歷史 | - | `List[Turn]` |
| `/api/v1/voice-profiles` | POST | 上傳聲音樣本 | `multipart/form-data` | `{profile_id}` |
| `/api/v1/voice-profiles` | GET | 列出所有聲音檔案 | - | `List[VoiceProfile]` |
| `/api/v1/voice-profiles/{id}` | DELETE | 刪除聲音檔案 | - | `{success: true}` |
| `/api/v1/prosody/{transcription_id}` | GET | 獲取語音分析 | - | `ProsodyScore` |
| `/api/v1/health` | GET | 健康檢查 | - | `{status, services}` |
| `/api/v1/metrics` | GET | 系統指標 | - | Prometheus 格式 |

#### 2.4.2 WebSocket API

**連接 URL**: `wss://api.example.com/ws/{session_id}`

**消息格式** (JSON):

```typescript
// Client → Server: 音頻數據
{
  "type": "audio_chunk",
  "data": "<base64-encoded PCM16>",
  "timestamp": 1698765432000,
  "sr": 16000
}

// Server → Client: 轉錄結果 (實時)
{
  "type": "transcription_partial",
  "text": "今天天氣",
  "confidence": 0.92,
  "is_final": false
}

// Server → Client: LLM 響應 (流式)
{
  "type": "llm_token",
  "token": "真",
  "turn_id": "uuid"
}

// Server → Client: TTS 音頻 (流式)
{
  "type": "audio_chunk",
  "data": "<base64-encoded audio>",
  "mode": "fast",  // or "hq"
  "duration_ms": 500
}

// Server → Client: 韻律分析完成
{
  "type": "prosody_analysis",
  "transcription_id": "uuid",
  "scores": {
    "confidence": 78.5,
    "stability": 82.3,
    "affability": 75.1
  }
}

// Client → Server: 切換 TTS 模式
{
  "type": "set_tts_mode",
  "mode": "hq",
  "voice_profile_id": "uuid"
}

// Server → Client: 錯誤
{
  "type": "error",
  "code": "VRAM_EXHAUSTED",
  "message": "顯存不足,已降級至快速模式",
  "trace_id": "uuid"
}
```

---

## 第 3 部分:部署與基礎設施 (Deployment & Infrastructure)

### 3.1 部署架構 (Deployment Architecture)

```mermaid
graph TB
    subgraph "Host Machine: Linux (Ubuntu 22.04)"
        subgraph "Docker Network: avatar_network"
            Nginx[Nginx<br/>Reverse Proxy<br/>Port: 80/443]

            subgraph "Application Services"
                Orchestrator[Orchestrator API<br/>Port: 8000]
                Frontend[Frontend Static<br/>Port: 3000]
            end

            subgraph "AI Services (GPU)"
                vLLM_Container[vLLM<br/>Port: 8001<br/>GPU: 0]
                TTS_Fast[Fast TTS<br/>Port: 8002<br/>GPU: 0]
                TTS_HQ[HQ TTS<br/>Port: 8003<br/>GPU: 0]
            end

            subgraph "AI Services (CPU)"
                ASR_Container[ASR<br/>Port: 8004<br/>CPU: 8 cores]
                Prosody_Container[Prosody<br/>Port: 8005<br/>CPU: 4 cores]
            end

            subgraph "Data Layer"
                PostgreSQL_Container[PostgreSQL<br/>Port: 5432]
                Redis_Container[Redis<br/>Port: 6379]
                MinIO_Container[MinIO<br/>Port: 9000/9001]
            end

            subgraph "Monitoring"
                Prometheus_Container[Prometheus<br/>Port: 9090]
                Grafana_Container[Grafana<br/>Port: 3001]
            end
        end

        GPU[NVIDIA RTX 4090<br/>24GB VRAM]
        SSD[1TB NVMe SSD<br/>Docker Volumes]
    end

    Internet[Internet] -->|HTTPS| Nginx
    Nginx --> Orchestrator
    Nginx --> Frontend
    Nginx --> Grafana_Container

    Orchestrator --> vLLM_Container
    Orchestrator --> ASR_Container
    Orchestrator --> TTS_Fast
    Orchestrator --> TTS_HQ
    Orchestrator --> Prosody_Container
    Orchestrator --> PostgreSQL_Container
    Orchestrator --> Redis_Container
    Orchestrator --> MinIO_Container

    Prometheus_Container --> Orchestrator
    Prometheus_Container --> vLLM_Container
    Grafana_Container --> Prometheus_Container

    vLLM_Container -.->|使用| GPU
    TTS_Fast -.->|使用| GPU
    TTS_HQ -.->|使用| GPU

    PostgreSQL_Container -.->|持久化| SSD
    MinIO_Container -.->|持久化| SSD

    style GPU fill:#E94B3C,stroke:#C73A2E,stroke-width:2px,color:#fff
    style SSD fill:#F5A623,stroke:#D68910,stroke-width:2px
```

---

### 3.2 Docker Compose 配置

**檔案**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # ========== 前端 ==========
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_WS_URL=ws://localhost:8000/ws
      - VITE_API_HTTP_URL=http://localhost:8000/api/v1
    networks:
      - avatar_network
    restart: unless-stopped

  # ========== Nginx 反向代理 ==========
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - orchestrator
      - frontend
    networks:
      - avatar_network
    restart: unless-stopped

  # ========== 後端編排層 ==========
  orchestrator:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://avatar:password@postgres:5432/avatar_db
      - REDIS_URL=redis://redis:6379/0
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
      - VLLM_URL=http://vllm:8001/v1
      - ASR_URL=http://asr:8004
      - TTS_FAST_URL=http://tts_fast:8002
      - TTS_HQ_URL=http://tts_hq:8003
      - PROSODY_URL=http://prosody:8005
      - LOG_LEVEL=INFO
    depends_on:
      - postgres
      - redis
      - minio
      - vllm
      - asr
    networks:
      - avatar_network
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  # ========== vLLM 服務 ==========
  vllm:
    image: vllm/vllm-openai:v0.6.0
    command:
      - --model
      - Qwen/Qwen2.5-7B-Instruct-AWQ
      - --gpu-memory-utilization
      - "0.85"
      - --max-model-len
      - "4096"
      - --kv-cache-dtype
      - fp8
      - --quantization
      - awq
      - --tensor-parallel-size
      - "1"
      - --port
      - "8001"
    ports:
      - "8001:8001"
    environment:
      - HF_HOME=/cache
      - CUDA_VISIBLE_DEVICES=0
    volumes:
      - ./models/llm:/cache
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    networks:
      - avatar_network
    restart: unless-stopped

  # ========== ASR 服務 ==========
  asr:
    build:
      context: ./services/asr
      dockerfile: Dockerfile
    ports:
      - "8004:8004"
    environment:
      - MODEL_NAME=large-v3-turbo
      - COMPUTE_TYPE=int8
      - DEVICE=cpu
      - THREADS=8
      - VAD_ENABLED=true
    volumes:
      - ./models/asr:/models
    networks:
      - avatar_network
    restart: unless-stopped

  # ========== Fast TTS 服務 ==========
  tts_fast:
    build:
      context: ./services/tts_fast
      dockerfile: Dockerfile
    ports:
      - "8002:8002"
    environment:
      - MODEL_NAME=F5-TTS
      - CUDA_VISIBLE_DEVICES=0
    volumes:
      - ./models/tts_fast:/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    networks:
      - avatar_network
    restart: unless-stopped

  # ========== HQ TTS 服務 ==========
  tts_hq:
    build:
      context: ./services/tts_hq
      dockerfile: Dockerfile
    ports:
      - "8003:8003"
    environment:
      - MODEL_NAME=CosyVoice3
      - CUDA_VISIBLE_DEVICES=0
      - LAZY_LOAD=true  # 按需載入
    volumes:
      - ./models/tts_hq:/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    networks:
      - avatar_network
    restart: unless-stopped

  # ========== Prosody 分析服務 ==========
  prosody:
    build:
      context: ./services/prosody
      dockerfile: Dockerfile
    ports:
      - "8005:8005"
    environment:
      - WORKERS=4
    networks:
      - avatar_network
    restart: unless-stopped

  # ========== PostgreSQL ==========
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_USER=avatar
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=avatar_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - avatar_network
    restart: unless-stopped

  # ========== Redis ==========
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - avatar_network
    restart: unless-stopped

  # ========== MinIO ==========
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - minio_data:/data
    networks:
      - avatar_network
    restart: unless-stopped

  # ========== Prometheus ==========
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - avatar_network
    restart: unless-stopped

  # ========== Grafana ==========
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    depends_on:
      - prometheus
    networks:
      - avatar_network
    restart: unless-stopped

networks:
  avatar_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  minio_data:
  prometheus_data:
  grafana_data:
```

---

### 3.3 資源規劃 (Hardware Resource Allocation)

#### 3.3.1 VRAM 分配總覽

| 模型/服務 | VRAM 佔用 | 部署模式 | 優先級 |
|:---|:---|:---|:---|
| vLLM (Qwen2.5-7B-AWQ) | 9-12GB | 常駐 | P0 (最高) |
| Fast TTS (F5-TTS) | 1GB | 按需短駐 | P1 |
| HQ TTS (CosyVoice3) | 3-4GB | 按需載入 | P2 |
| 系統 Overhead | 1-2GB | 常駐 | - |
| **余量 Buffer** | 5-8GB | 動態 | - |

**並發能力估算**:
*   **3 並發會話**: 穩定運行,P95 延遲 < 3.5s
*   **5 並發會話**: 可運行,P95 延遲 < 5s
*   **>5 並發**: 需要排隊或拒絕服務

#### 3.3.2 CPU/RAM 分配

| 服務 | CPU 核心 | RAM | 說明 |
|:---|:---|:---|:---|
| Orchestrator API | 4 | 4GB | FastAPI + asyncio |
| vLLM | 4 | 16GB | 推理輔助計算 |
| ASR (faster-whisper) | 8 | 8GB | 主要計算負載 |
| Prosody Analyzer | 4 | 4GB | openSMILE + Parselmouth |
| PostgreSQL | 2 | 4GB | 數據庫 |
| Redis | 2 | 2GB | 緩存 + 佇列 |
| MinIO | 2 | 2GB | 對象存儲 |
| Monitoring | 2 | 4GB | Prometheus + Grafana |
| **總計** | **28/64** | **44/64GB** | 留 20GB 系統余量 |

#### 3.3.3 存儲規劃

| 數據類型 | 日均增長 | 保留期 | 總需求 |
|:---|:---|:---|:---|
| 原始音頻 (16kHz WAV) | ~2GB/天 | 30天 | 60GB |
| 合成音頻 (快檔) | ~1GB/天 | 7天 | 7GB |
| 合成音頻 (高質) | ~3GB/天 | 7天 | 21GB |
| PostgreSQL 數據 | ~500MB/天 | 永久 | 50GB (首年) |
| 模型權重 | - | - | 50GB |
| 日誌與監控 | ~200MB/天 | 90天 | 18GB |
| **總計** | | | **~206GB / 1TB** |

---

## 第 4 部分:跨領域考量 (Cross-Cutting Concerns)

### 4.1 可觀測性 (Observability)

#### 4.1.1 關鍵指標 (Key Metrics)

**LLM 指標**:
```prometheus
# TTFT (Time To First Token)
llm_ttft_seconds{model="qwen2.5-7b"} histogram
  - P50, P95, P99

# Tokens per Second
llm_tokens_per_second{model="qwen2.5-7b"} gauge

# KV Cache 使用率
llm_kv_cache_usage_percent{model="qwen2.5-7b"} gauge

# 請求佇列長度
llm_request_queue_length gauge
```

**STT 指標**:
```prometheus
# RTF (Real-Time Factor)
asr_rtf{model="large-v3-turbo"} histogram

# WER/CER (抽樣)
asr_cer_percent gauge

# VAD 準確率
asr_vad_accuracy_percent gauge
```

**TTS 指標**:
```prometheus
# 快檔合成延遲
tts_synthesis_latency_seconds{mode="fast"} histogram

# 高質檔載入耗時
tts_model_load_seconds{mode="hq"} histogram

# RTF
tts_rtf{mode="fast|hq"} histogram
```

**E2E 指標**:
```prometheus
# 端到端延遲 (50字場景)
conversation_e2e_latency_seconds histogram

# 會話並發數
active_sessions_count gauge

# WebSocket 連接數
websocket_connections_active gauge
```

#### 4.1.2 Grafana 儀表板

建議創建以下儀表板:
1.  **Overview Dashboard**: 系統健康、並發會話、E2E 延遲
2.  **LLM Dashboard**: TTFT、TPS、KV Cache、佇列
3.  **Speech Dashboard**: ASR RTF、TTS 延遲、模型載入時間
4.  **Infrastructure Dashboard**: VRAM/CPU/RAM 使用率、磁盤 I/O

---

### 4.2 安全性與隱私 (Security & Privacy)

#### 4.2.1 威脅模型 (Threat Model)

| 威脅 | 風險等級 | 緩解措施 |
|:---|:---|:---|
| **數據洩露** (音頻外洩) | 🔴 高 | - 音頻加密存儲 (AES-256)<br>- MinIO 訪問控制<br>- 預簽名 URL 有效期 1h |
| **WebSocket 劫持** | 🟡 中 | - WSS (TLS 1.3+)<br>- Session Token 驗證<br>- CSRF Token |
| **模型投毒** | 🟢 低 | - 模型 checksum 驗證<br>- 僅從官方源下載 |
| **DDoS** | 🟡 中 | - Rate Limiting (Nginx)<br>- 連接數限制<br>- IP 黑名單 |

#### 4.2.2 數據隱私設計

*   **數據最小化**: 僅存儲必要的音頻與特徵
*   **匿名化**: `user_id` 使用 UUID,不關聯真實身份
*   **可刪除性**: 提供 API 刪除所有用戶數據
*   **本地化**: 所有計算在地端,數據不出境

---

### 4.3 錯誤處理與韌性 (Error Handling & Resilience)

#### 4.3.1 錯誤分類與處理策略

| 錯誤類型 | 範例 | 處理策略 | 用戶提示 |
|:---|:---|:---|:---|
| **VRAM OOM** | LLM/TTS 顯存不足 | - 降級至 Fast TTS<br>- 限流<br>- 驅逐閒置模型 | "系統繁忙,已切換至快速模式" |
| **模型載入失敗** | HQ TTS 載入超時 | - Fallback 至 Fast TTS<br>- 記錄錯誤<br>- 重試 3 次 | "高品質模式暫不可用" |
| **WebSocket 斷線** | 網路不穩定 | - 自動重連 (Exponential Backoff)<br>- 恢復會話狀態 | "連線中斷,正在重連..." |
| **音頻品質差** | 背景噪音大 | - 繼續處理<br>- 標記低信度 | "背景噪音較大,可能影響準確度" |
| **數據庫錯誤** | PostgreSQL 連接失敗 | - 重試連接池<br>- 降級至內存緩存 | "服務暫時不可用,請稍後再試" |

#### 4.3.2 斷路器 (Circuit Breaker)

```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=30)
async def call_hq_tts(text: str, voice_profile_id: str):
    """
    調用 HQ TTS,若連續失敗 5 次則開啟斷路器
    30 秒後嘗試半開狀態
    """
    try:
        return await tts_hq_client.synthesize(text, voice_profile_id)
    except Exception as e:
        logger.error(f"HQ TTS failed: {e}")
        raise
```

---

## 第 5 部分:風險與緩解 (Risks & Mitigation)

| 風險 ID | 風險描述 | 可能性 | 影響 | 緩解策略 | 負責人 |
|:---|:---|:---|:---|:---|:---|
| **R-001** | VRAM 不足導致 OOM | 中 | 🔴 高 | - INT4/FP8 量化<br>- KV cache FP8<br>- 限制 max_num_seqs<br>- 監控 VRAM 告警 | AI Engineer |
| **R-002** | HQ TTS 載入延遲過長 (>10s) | 高 | 🟡 中 | - 預熱機制<br>- LRU 熱度驅逐<br>- 可選純快檔模式<br>- 異步載入 | AI Engineer |
| **R-003** | 台式口音 ASR 誤字率高 (CER >10%) | 中 | 🟡 中 | - 使用 large-v3-turbo<br>- 域內語彙表<br>- 後處理糾錯<br>- 蒐集標註資料微調 | AI Engineer |
| **R-004** | 並發會話數超載 | 低 | 🟡 中 | - 限流 (5 會話上限)<br>- 排隊機制<br>- 拒絕策略<br>- 自動伸縮 (Post-MVP) | Backend Engineer |
| **R-005** | WebSocket 連線不穩定 | 中 | 🟢 低 | - 斷線重連<br>- Heartbeat<br>- 會話狀態恢復<br>- 錯誤重試 | Backend Engineer |
| **R-006** | Docker 網路效能損耗 | 低 | 🟢 低 | - 使用 host 網路模式<br>- 優化容器間通訊<br>- gRPC 替代 HTTP | DevOps Engineer |
| **R-007** | 語音分析分數不穩定 | 中 | 🟢 低 | - 使用相對分數<br>- 同人前後對比<br>- 標註資料校準回歸頭 | AI Engineer |
| **R-008** | 模型下載失敗 (初始化) | 低 | 🟡 中 | - 本地緩存模型<br>- 鏡像站備份<br>- 離線部署選項 | DevOps Engineer |

---

## 第 6 部分:擴展路線圖 (Scalability Roadmap)

### Phase 1: MVP (當前 - 4週)
**目標**: 單機 RTX 4090,3-5 並發,驗證技術可行性

**架構**:
*   單機 Docker Compose
*   LLM 常駐 + HQ TTS 按需載入
*   先快後美雙檔 TTS

**驗收標準**:
*   ✅ E2E P95 ≤ 3.5s
*   ✅ 2 小時 5 會話無 OOM
*   ✅ 音頻 100% 落盤可追溯

---

### Phase 2: 雙機分工 (3-6個月)
**目標**: 10-15 並發,HQ TTS 常駐,延遲更穩

**架構升級**:
*   **機器 A**: LLM 專用 (RTX 4090)
*   **機器 B**: Speech 專用 (ASR + TTS-Fast + TTS-HQ, RTX 4090)
*   引入 **服務網格** (如 Istio/Linkerd)

**預期收益**:
*   並發提升至 10-15 會話
*   HQ TTS 可常駐,去除載入延遲
*   LLM 與 TTS 資源隔離,互不干擾

---

### Phase 3: 多機/高階 GPU (6-12個月)
**目標**: 商業化部署,50+ 並發,高可用

**架構升級**:
*   使用 **48GB GPU** (RTX 6000 Ada) 或多卡
*   引入 **Kubernetes** + **Triton Inference Server**
*   多實例部署 + 負載均衡
*   引入 70B 模型選項 (專家模式)

**額外功能**:
*   多用戶系統 (身份驗證/授權)
*   跨區域部署 (容災)
*   工具調用 (Function Calling)
*   多語言支援

---

## 附錄 (Appendix)

### 附錄 A: 技術術語對照表

| 英文 | 中文 | 說明 |
|:---|:---|:---|
| STT | 語音轉文字 | Speech-to-Text |
| TTS | 文字轉語音 | Text-to-Speech |
| LLM | 大型語言模型 | Large Language Model |
| VAD | 語音活動檢測 | Voice Activity Detection |
| TTFT | 首 Token 時間 | Time To First Token |
| RTF | 實時因子 | Real-Time Factor (處理時間/音訊長度) |
| E2E | 端到端 | End-to-End |
| Prosody | 韻律 | 語音的節奏、音調、重音 |
| Zero-shot | 零樣本 | 無需訓練即可使用 |
| AWQ | 權重量化方法 | Activation-aware Weight Quantization |
| CT2 | CTranslate2 | 推理加速框架 |
| KV Cache | 鍵值緩存 | LLM 推理加速技術 |

### 附錄 B: 參考文檔

1.  **需求分析**: `需求.md`
2.  **PRD**: `02_project_brief_and_prd.md`
3.  **BDD 指南**: `03_behavior_driven_development_guide.md`
4.  **ADR 記錄**: `[ADR 目錄]`
5.  **API 文檔**: `[Swagger UI]`

### 附錄 C: 外部資源

*   [vLLM Documentation](https://docs.vllm.ai/)
*   [faster-whisper GitHub](https://github.com/SYSTRAN/faster-whisper)
*   [F5-TTS GitHub](https://github.com/SWivid/F5-TTS)
*   [CosyVoice GitHub](https://github.com/FunAudioLLM/CosyVoice)
*   [openSMILE Documentation](https://www.audeering.com/research/opensmile/)

---

**審核記錄 (Review History):**

| 日期 | 審核人 | 版本 | 變更摘要 |
|:---|:---|:---|:---|
| 2025-11-01 | [VibeCoding AI] | v1.0 | 初稿完成,整合需求文檔架構設計 |
