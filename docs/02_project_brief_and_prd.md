# 專案簡報與產品需求文件 (Project Brief & PRD) - AI 語音助手機器人

---

**文件版本 (Document Version):** `v1.0`
**最後更新 (Last Updated):** `2025-11-01`
**主要作者 (Lead Author):** `[VibeCoding AI]`
**審核者 (Reviewers):** `[技術負責人, 產品經理]`
**狀態 (Status):** `已批准 (Approved)`

---

## 目錄 (Table of Contents)

1.  [專案總覽 (Project Overview)](#第-1-部分專案總覽-project-overview)
2.  [商業目標 (Business Objectives) - 「為何做?」](#第-2-部分商業目標-business-objectives---為何做)
3.  [使用者故事與允收標準 (User Stories & UAT) - 「做什麼?」](#第-3-部分使用者故事與允收標準-user-stories--uat---做什麼)
4.  [範圍與限制 (Scope & Constraints)](#第-4-部分範圍與限制-scope--constraints)
5.  [待辦問題與決策 (Open Questions & Decisions)](#第-5-部分待辦問題與決策-open-questions--decisions)

---

**目的**: 本文件旨在定義專案的「為何」與「為誰」,為整個專案設定最高層次的目標和邊界。它是所有後續設計、開發與測試工作的唯一事實來源 (Single Source of Truth)。

---

## 第 1 部分:專案總覽 (Project Overview)

| 區塊 | 內容 |
| :--- | :--- |
| **專案名稱** | AI Voice Assistant Bot (AI 語音助手機器人) |
| **專案代號** | AVATAR (Autonomous Voice Assistant with Training-free Audio cloneR) |
| **狀態** | 開發中 (MVP Phase) |
| **目標發布日期** | 2025-12-01 (4週開發週期) |
| **核心團隊** | Lead Engineer: [待定]<br>AI/ML Engineer: [待定]<br>Backend Engineer: [待定]<br>Frontend Engineer: [待定] |

---

## 第 2 部分:商業目標 (Business Objectives) - 「為何做?」

*在投入資源前,我們必須清晰地定義問題、目標使用者和商業價值,避免開發出無人需要的產品。*

| 區塊 | 內容 |
| :--- | :--- |
| **1. 背景與痛點** | **市場痛點**:<br>- 當前 AI 對話助手多依賴雲端 API,存在隱私風險與延遲問題<br>- 語音克隆技術門檻高,普通用戶難以使用<br>- 現有方案缺乏對語音品質的自動分析與反饋<br><br>**技術挑戰**:<br>- 如何在單機有限資源（RTX 4090 24GB）下運行多個大型 AI 模型<br>- 如何在保證音質的前提下實現低延遲（≤3秒）的端到端對話<br>- 如何平衡「快速回應」與「高品質語音」的矛盾需求<br><br>**目標用戶**:<br>- 需要隱私保護的企業（金融、醫療、法律）<br>- 需要低延遲語音互動的應用場景（客服、培訓、遊戲）<br>- 對語音品質有高要求的內容創作者 |
| **2. 策略契合度** | **技術能力展示**:<br>- 展示在資源受限環境下的 AI 系統優化能力<br>- 展示多模型協同工作的架構設計能力<br>- 展示對實時性能要求的系統調優能力<br><br>**市場定位**:<br>- 定位於「全地端 AI 對話助手」的技術驗證（MVP）<br>- 為後續產品化提供技術基礎與可行性驗證<br>- 探索「先快後美」的雙檔 TTS 架構可行性 |
| **3. 成功指標 (Success Metrics)** | **核心 SLO (Service Level Objectives)**:<br>- **主要指標**: 端到端延遲 P95 ≤ 3.5 秒（50 字回應）<br>- **次要指標**: LLM TTFT (Time To First Token) P95 ≤ 800ms<br>- **品質指標**: 快檔 TTS 產出延遲 P50 ≤ 1.5 秒<br><br>**系統穩定性**:<br>- 連續 2 小時壓測（5 會話）無 OOM<br>- 語音與特徵 100% 落盤可追溯<br><br>**用戶體驗**:<br>- 語音分析準確率（自信度/平穩度/親和力）相對分數穩定性 >85%<br>- 聲音克隆相似度主觀評分 ≥7/10 |

---

## 第 3 部分:使用者故事與允收標準 (User Stories & UAT) - 「做什麼?」

*這是連接「商業需求」與「技術實現」的橋樑。每個使用者故事都應直接對應到下一個階段的 BDD 情境。*

### 核心史詩 1 (Core Epic): 語音輸入與對話 (Voice Input & Conversation)

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) | 連結至 BDD 文件 |
| :--- | :--- | :--- | :--- |
| **US-101** | **As a** 使用者,<br>**I want to** 透過語音輸入與 AI 對話,<br>**so that** 我可以免手打字進行互動。 | 1. 點擊麥克風按鈕開始錄音<br>2. 說話時即時顯示轉錄文字（partial results）<br>3. 停止說話後完成語音識別<br>4. 識別延遲 < 600ms | `[features/voice_input.feature]` |
| **US-102** | **As a** 使用者,<br>**I want to** AI 用語音回應我,<br>**so that** 我可以聽到回答而非閱讀文字。 | 1. AI 回應先用「快檔」語音播放（≤3秒）<br>2. 後續以「高質檔」覆蓋（若選擇）<br>3. 播放流暢無明顯卡頓 | `[features/voice_output.feature]` |
| **US-103** | **As a** 使用者,<br>**I want to** 查看對話歷史,<br>**so that** 我可以回顧之前的對話內容。 | 1. 顯示完整對話記錄（文字+語音）<br>2. 可重新播放歷史語音<br>3. 可下載對話記錄 | `[features/chat_history.feature]` |

### 核心史詩 2 (Core Epic): 聲音克隆 (Voice Cloning)

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) | 連結至 BDD 文件 |
| :--- | :--- | :--- | :--- |
| **US-201** | **As a** 使用者,<br>**I want to** 上傳一段聲音樣本,<br>**so that** AI 可以用我指定的聲音回應。 | 1. 支援上傳 WAV/MP3 格式（5-30 秒）<br>2. 顯示上傳進度與處理狀態<br>3. 完成後可選擇此聲紋進行對話 | `[features/voice_cloning.feature]` |
| **US-202** | **As a** 使用者,<br>**I want to** 選擇「快速模式」或「高品質模式」,<br>**so that** 我可以根據需求平衡速度與品質。 | 1. 介面提供模式切換選項<br>2. 快速模式: ≤3 秒回應<br>3. 高品質模式: 自然口音、情緒還原 | `[features/tts_modes.feature]` |
| **US-203** | **As a** 使用者,<br>**I want to** 管理我的聲紋庫,<br>**so that** 我可以切換不同的聲音風格。 | 1. 顯示所有已上傳聲紋列表<br>2. 可刪除、重命名聲紋<br>3. 可試聽各聲紋效果 | `[features/voice_management.feature]` |

### 核心史詩 3 (Core Epic): 語音分析 (Voice Analysis)

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) | 連結至 BDD 文件 |
| :--- | :--- | :--- | :--- |
| **US-301** | **As a** 使用者,<br>**I want to** 看到我說話的語音分析報告,<br>**so that** 我可以了解我的表達品質。 | 1. 顯示自信度、平穩度、親和力分數（0-100）<br>2. 顯示語速、停頓比、音調變化圖表<br>3. 提供改進建議 | `[features/voice_analysis.feature]` |
| **US-302** | **As a** 使用者,<br>**I want to** 對比不同時間的語音表現,<br>**so that** 我可以追蹤我的進步。 | 1. 顯示歷史分數趨勢圖<br>2. 可選擇日期範圍對比<br>3. 匯出分析報告（PDF/CSV） | `[features/voice_analytics.feature]` |

---

## 第 4 部分:範圍與限制 (Scope & Constraints)

*明確定義邊界是專案成功的關鍵。這為 LLM 生成程式碼提供了最重要的「護欄」。*

| 區塊 | 內容 |
| :--- | :--- |
| **功能性需求 (In Scope)** | **核心功能 (MVP)**:<br>- ✅ 語音輸入（STT with VAD）<br>- ✅ 文字對話（LLM）<br>- ✅ 雙檔語音輸出（TTS: Fast + HQ）<br>- ✅ 聲音克隆（Zero-shot TTS）<br>- ✅ 語音品質分析（Prosody metrics）<br>- ✅ 聲紋管理（上傳/刪除/切換）<br>- ✅ 對話歷史記錄<br><br>**基礎設施**:<br>- ✅ WebSocket 即時通訊<br>- ✅ Docker Compose 部署<br>- ✅ Prometheus + Grafana 監控<br>- ✅ MinIO 音檔存儲<br>- ✅ PostgreSQL 特徵/分數存儲 |
| **非功能性需求 (NFRs)** | **性能要求**:<br>- 端到端延遲（50 字）: P95 ≤ 3.5s<br>- LLM TTFT: P95 ≤ 800ms<br>- 快檔 TTS: P50 ≤ 1.5s<br>- ASR RTF (Real-Time Factor) < 0.3<br><br>**並發能力**:<br>- 單卡 RTX 4090 支援 3-5 並發會話<br>- 穩定運行 2 小時無 OOM<br><br>**安全性**:<br>- 所有模型本地運行（無雲端 API）<br>- 語音資料 100% 落盤可追溯<br>- WebSocket 連線加密（WSS）<br><br>**可用性**:<br>- 前端介面響應式設計（支援桌面/平板）<br>- 錯誤處理與用戶友好提示<br><br>**可維護性**:<br>- 模組化架構（Clean Architecture）<br>- 完整 API 文檔（OpenAPI/Swagger）<br>- 日誌與追蹤（Structured Logging + Trace ID） |
| **不做什麼 (Out of Scope)** | **MVP 不包含**:<br>- ❌ 多用戶系統（身份驗證/授權）<br>- ❌ 群組對話/多人會話<br>- ❌ 雲端同步/跨設備<br>- ❌ 移動端 App（僅 Web）<br>- ❌ 情緒識別模型（使用傳統韻律分析）<br>- ❌ 70B 大模型支援<br>- ❌ 多語言支援（僅繁體中文/台灣口音優化）<br>- ❌ 實時語音對話（需等待完整句子）<br>- ❌ 視訊通話<br>- ❌ 支付系統 |
| **假設與依賴** | **硬體假設**:<br>- ✅ 運行環境: Linux 系統<br>- ✅ GPU: NVIDIA RTX 4090 (24GB VRAM)<br>- ✅ CPU: Intel i7-13700 或同等級<br>- ✅ RAM: 64GB<br>- ✅ Storage: 1TB SSD<br><br>**軟體依賴**:<br>- ✅ Docker & Docker Compose<br>- ✅ NVIDIA Driver + CUDA 12.x<br>- ✅ Python 3.11+<br>- ✅ Node.js 20+ (前端)<br><br>**外部依賴**:<br>- ⚠️ 模型下載: HuggingFace (需網路連線初始化)<br>- ⚠️ 容器映像: Docker Hub / GHCR<br><br>**技術假設**:<br>- ✅ 使用者具備穩定網路（僅初始化需要）<br>- ✅ 使用者麥克風正常運作<br>- ✅ 瀏覽器支援 WebRTC/MediaRecorder API |
| **已知限制 (Known Limitations)** | **資源限制**:<br>- 單卡 24GB 下 HQ-TTS 需「按需載入」,首次啟動延遲 5-10 秒<br>- LLM 限制 max_model_len=4096 tokens<br>- 並發會話受 VRAM 限制（3-5 會話）<br><br>**品質權衡**:<br>- 快檔 TTS 音質不如高質檔<br>- 台式口音 ASR 可能有誤字（CER ~5-10%）<br>- 語音分析為「相對分數」,非絕對客觀指標<br><br>**延遲限制**:<br>- HQ-TTS 首次載入需 5-10 秒<br>- 長句（>100 字）可能超過 3 秒目標 |

---

## 第 5 部分:待辦問題與決策 (Open Questions & Decisions)

*記錄在討論過程中出現的、需要進一步澄清的問題或已做出的重要決策。*

### 已決策 (Decided)

| 決策 ID | 描述 | 決策結果 | 理由 | 負責人 |
| :--- | :--- | :--- | :--- | :--- |
| **D-001** | LLM 選型: Qwen2.5-7B vs Llama-3.1-8B | **Qwen2.5-7B-Instruct-AWQ** | 繁中能力強、社群支援好、AWQ 量化版本可用 | Lead AI Engineer |
| **D-002** | TTS 快檔選型: F5-TTS vs MeloTTS | **F5-TTS** | 非自回歸架構、啟動快、適合即時場景 | Lead AI Engineer |
| **D-003** | TTS 高質檔選型 | **CosyVoice3** (主) + **XTTS v2** (備) | CosyVoice3 台式口音自然、零樣本克隆效果佳 | Lead AI Engineer |
| **D-004** | 前端框架 | **React + Vite + TypeScript** | 開發效率高、生態成熟、TypeScript 類型安全 | Frontend Engineer |
| **D-005** | 後端框架 | **FastAPI + uvicorn** | 異步支援、WebSocket 原生、自動生成 API 文檔 | Backend Engineer |
| **D-006** | 語音分析工具 | **openSMILE + Parselmouth** (CPU) | 可解釋指標、不佔用 GPU、輕量級 | Lead AI Engineer |
| **D-007** | 部署方式 | **Docker Compose** (MVP) | 簡化部署、單機即可、後續可遷移 K8s | DevOps Engineer |
| **D-008** | 資料庫選型 | **PostgreSQL** (結構化) + **MinIO** (音檔) | 成熟穩定、JSONB 支援、S3 相容 | Backend Engineer |

### 待討論 (Open Questions)

| 問題 ID | 描述 | 狀態 | 優先級 | 負責人 |
| :--- | :--- | :--- | :--- | :--- |
| **Q-001** | HQ-TTS 按需載入策略:LRU vs LFU? | [討論中] | P1 | Lead AI Engineer |
| **Q-002** | 是否需要支援語音喚醒詞（Wake Word）? | [待討論] | P2 | Product Manager |
| **Q-003** | 語音分析分數是否需要標註資料校準? | [待討論] | P2 | Lead AI Engineer |
| **Q-004** | 是否需要支援多輪對話上下文管理? | [已決定: MVP 階段支援] | P1 | Backend Engineer |
| **Q-005** | 前端是否需要離線支援（PWA）? | [待討論] | P3 | Frontend Engineer |

### 技術風險 (Technical Risks)

| 風險 ID | 描述 | 影響 | 可能性 | 緩解措施 | 負責人 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R-001** | VRAM OOM（記憶體溢出） | 🔴 高 | 中 | - INT4/FP8 量化<br>- KV cache FP8<br>- 限制 max_num_seqs<br>- 監控 VRAM 使用率 | Lead AI Engineer |
| **R-002** | HQ-TTS 載入延遲過長 | 🟡 中 | 高 | - 預熱機制<br>- 熱度驅逐（LRU）<br>- 可選「純快檔」模式 | Lead AI Engineer |
| **R-003** | 台式口音 ASR 誤字率高 | 🟡 中 | 中 | - 使用 large-v3-turbo<br>- 域內語彙表<br>- 後處理糾錯 | Lead AI Engineer |
| **R-004** | WebSocket 連線穩定性 | 🟡 中 | 低 | - 斷線重連機制<br>- Heartbeat<br>- 錯誤重試 | Backend Engineer |
| **R-005** | Docker 網路效能損耗 | 🟢 低 | 低 | - 使用 host 網路模式<br>- 優化容器間通訊 | DevOps Engineer |

---

## 附錄 A: 關鍵術語 (Glossary)

| 術語 | 定義 |
| :--- | :--- |
| **STT** | Speech-to-Text,語音轉文字 |
| **TTS** | Text-to-Speech,文字轉語音 |
| **LLM** | Large Language Model,大型語言模型 |
| **VAD** | Voice Activity Detection,語音活動檢測 |
| **TTFT** | Time To First Token,首個 token 產生時間 |
| **RTF** | Real-Time Factor,實時因子（處理時間/音訊長度） |
| **E2E** | End-to-End,端到端 |
| **Prosody** | 韻律,語音的節奏、音調、重音等 |
| **Zero-shot TTS** | 零樣本語音合成,無需訓練即可克隆聲音 |
| **INT4/FP8** | 模型量化方法,減少記憶體佔用 |
| **KV Cache** | Key-Value Cache,LLM 推理加速技術 |

---

## 附錄 B: 參考資料 (References)

1. **需求分析文檔**: `需求.md`
2. **開發工作流程手冊**: `VibeCoding_Workflow_Templates/01_development_workflow_cookbook.md`
3. **架構決策記錄**: `[ADR 目錄]`
4. **API 設計規格**: `[待產出]`

---

**審核記錄 (Review History):**

| 日期 | 審核人 | 版本 | 變更摘要/主要反饋 |
| :--- | :--- | :--- | :--- |
| 2025-11-01 | [VibeCoding AI] | v1.0 | 初稿完成,基於需求分析產出 |
