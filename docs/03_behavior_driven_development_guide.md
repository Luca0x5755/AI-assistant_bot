# 行為驅動情境 (BDD) 指南與情境定義 - AI 語音助手機器人

---

**文件版本 (Document Version):** `v1.0`
**最後更新 (Last Updated):** `2025-11-01`
**主要作者 (Lead Author):** `[技術負責人, 產品經理]`
**狀態 (Status):** `活躍 (Active)`

---

## 目錄 (Table of Contents)

- [Ⅰ. BDD 核心原則](#ⅰ-bdd-核心原則)
- [Ⅱ. Gherkin 語法速查](#ⅱ-gherkin-語法速查)
- [Ⅲ. 專案 BDD Feature Files](#ⅲ-專案-bdd-feature-files)
  - [Feature 1: 語音輸入 (Voice Input)](#feature-1-語音輸入-voice-input)
  - [Feature 2: 語音輸出 (Voice Output)](#feature-2-語音輸出-voice-output)
  - [Feature 3: 聲音克隆 (Voice Cloning)](#feature-3-聲音克隆-voice-cloning)
  - [Feature 4: 語音分析 (Voice Analysis)](#feature-4-語音分析-voice-analysis)
  - [Feature 5: 對話管理 (Conversation Management)](#feature-5-對話管理-conversation-management)
- [Ⅳ. 最佳實踐](#ⅳ-最佳實踐)
- [Ⅴ. LLM Prompting 指南](#ⅴ-llm-prompting-指南)

---

**目的**: 本文件旨在提供一套標準化的指南和範本,用於編寫行為驅動開發 (BDD) 的情境。BDD 的核心是使用一種名為 Gherkin 的結構化自然語言,來描述系統的預期行為,確保業務人員、開發者和測試者對「完成」的定義達成共識。

---

## Ⅰ. BDD 核心原則

1.  **從對話開始**: BDD 不是關於寫測試,而是關於團隊成員（業務、開發、測試）之間的對話,以確保對需求的共同理解。
2.  **由外而內**: 我們從使用者與系統的互動（外部行為）開始定義,然後才深入到內部實現。
3.  **使用通用語言 (Ubiquitous Language)**: 在 BDD 情境中使用的術語,應與在 PRD 和程式碼中使用的術語保持一致。
4.  **可執行規格**: BDD scenarios 不僅是文檔,更是可執行的測試用例,確保實現與規格一致。

---

## Ⅱ. Gherkin 語法速查

Gherkin 是編寫 BDD 情境的語言。一個 `.feature` 檔案通常包含以下關鍵字:

*   `Feature`: 描述一個高層次的功能,通常對應 PRD 中的一個 Epic。
*   `Scenario`: 描述 `Feature` 下的一個具體業務場景或測試案例。
*   `Given`: **(給定)** 描述場景開始前的初始狀態或上下文（Arrange）。
*   `When`: **(當)** 描述使用者執行的某個具體操作或觸發的事件（Act）。
*   `Then`: **(那麼)** 描述在 `When` 發生後,系統應有的輸出或結果（Assert）。
*   `And`, `But`: 用於連接多個 `Given`, `When`, 或 `Then` 步驟,使其更具可讀性。
*   `Background`: 用於定義在該 Feature 的所有 Scenarios 之前都需要執行的 `Given` 步驟,以減少重複。
*   `Scenario Outline`: 用於執行同一個場景的多組不同數據的測試,通常與 `Examples` 關鍵字配合使用。

### 標籤 (Tags)

使用標籤來組織和過濾測試:

*   `@happy-path`: 正常流程測試
*   `@sad-path`: 異常/錯誤處理測試
*   `@edge-case`: 邊界條件測試
*   `@smoke-test`: 冒煙測試（核心功能快速驗證）
*   `@performance`: 性能測試
*   `@mvp`: MVP 階段必須實現的功能
*   `@post-mvp`: 後續版本功能
*   `@wip`: Work In Progress,開發中的功能

---

## Ⅲ. 專案 BDD Feature Files

### Feature 1: 語音輸入 (Voice Input)

**檔案名稱**: `features/voice_input.feature`

**對應 PRD**: [US-101](./02_project_brief_and_prd.md#核心史詩-1-core-epic-語音輸入與對話-voice-input--conversation)

```gherkin
# Feature: 語音輸入與即時轉錄
# 目的: 允許使用者透過語音與系統互動,並提供即時轉錄反饋
# 對應 PRD: US-101

Feature: Voice Input with Real-time Transcription

  Background:
    Given the AI assistant is ready
    And I am on the chat interface
    And my microphone is connected and working

  @mvp @happy-path @smoke-test
  Scenario: 成功進行語音輸入並獲得即時轉錄
    Given I click the microphone button to start recording
    When I speak the sentence "今天天氣真好"
    Then I should see partial transcription updates in real-time
    And the final transcription should display "今天天氣真好"
    And the transcription latency should be less than 600ms
    And the recording should stop automatically when I stop speaking

  @mvp @happy-path
  Scenario: 使用 VAD 自動偵測語音停頓
    Given I am recording my voice
    When I speak "你好" and pause for 500ms
    Then the system should detect the pause
    And the system should finalize the transcription as "你好"
    And the recording should continue for next input

  @mvp @sad-path
  Scenario: 麥克風權限被拒絕
    Given I am on the chat interface
    When I click the microphone button
    And the browser denies microphone permission
    Then I should see an error message "無法存取麥克風,請檢查瀏覽器權限設定"
    And the recording button should remain in "disabled" state

  @mvp @sad-path
  Scenario: 環境噪音過大導致誤識別
    Given I am recording my voice
    When the background noise level exceeds -20dB
    And I speak "測試語音"
    Then the system should display a warning "背景噪音較大,可能影響識別準確度"
    But the transcription should still attempt to process the audio

  @mvp @edge-case
  Scenario: 長時間連續語音輸入
    Given I start voice recording
    When I continuously speak for 60 seconds
    Then the system should chunk the audio every 5-10 seconds
    And each chunk should be transcribed separately
    And the UI should display all transcriptions in sequence
    And the system should not encounter memory overflow

  @mvp @edge-case
  Scenario: 口音與方言識別（台灣口音）
    Given I am recording my voice
    When I speak in Taiwanese Mandarin accent "俺攏無咧用啦"
    Then the system should recognize and transcribe with CER < 10%
    And the transcription should handle common Taiwanese expressions

  @mvp @performance
  Scenario: STT 性能指標驗證
    Given I have prepared a 30-second test audio clip
    When I submit the audio for transcription
    Then the Real-Time Factor (RTF) should be < 0.3
    And the transcription should complete within 10 seconds
    And the system should log the processing time metrics
```

---

### Feature 2: 語音輸出 (Voice Output)

**檔案名稱**: `features/voice_output.feature`

**對應 PRD**: [US-102](./02_project_brief_and_prd.md#核心史詩-1-core-epic-語音輸入與對話-voice-input--conversation)

```gherkin
# Feature: 雙檔 TTS 語音輸出
# 目的: 提供快速回應與高品質語音的雙重選擇
# 對應 PRD: US-102

Feature: Dual-Mode TTS Voice Output

  Background:
    Given the AI assistant has generated a text response "你好,我是AI助手,很高興為你服務"
    And the response length is 50 characters

  @mvp @happy-path @smoke-test
  Scenario: 快速模式 TTS 輸出（先快後美策略）
    Given I am in "fast mode"
    When the LLM completes generating the response
    Then the system should immediately synthesize audio using Fast-TTS (F5-TTS)
    And the audio should start playing within 1.5 seconds (P50)
    And the audio should be split into sentences for streaming playback
    And the total E2E latency should be ≤ 3 seconds

  @mvp @happy-path
  Scenario: 高品質模式 TTS 輸出
    Given I am in "high-quality mode"
    And I have selected a voice profile "User_Voice_001"
    When the LLM completes generating the response
    Then the system should load HQ-TTS model (CosyVoice3) if not already loaded
    And the system should synthesize audio using HQ-TTS
    And the cloned voice should match the selected profile with similarity ≥ 7/10
    And the audio should preserve emotional intonation from the profile

  @mvp @happy-path
  Scenario: 先快後美策略（Fast then Beautiful）
    Given I am in "auto mode"
    When the LLM completes generating the response
    Then the system should first play Fast-TTS audio within 1.5s
    And the system should queue HQ-TTS generation in the background
    And when HQ-TTS is ready, the system should replace the audio in the chat history
    And the user should see a indicator showing "high-quality audio ready"

  @mvp @sad-path
  Scenario: HQ-TTS 模型載入失敗
    Given I am in "high-quality mode"
    When the HQ-TTS model fails to load due to VRAM shortage
    Then the system should log the error with trace ID
    And the system should fallback to Fast-TTS automatically
    And the user should see a notification "高品質模式暫不可用,已切換至快速模式"

  @mvp @edge-case
  Scenario: 長文本語音合成（100+ 字元）
    Given the AI response contains 150 characters
    When the TTS synthesis starts
    Then the system should split the text into sentences using punctuation
    And each sentence should be synthesized separately
    And the sentences should be streamed and played sequentially
    And the user should not experience significant gaps between sentences

  @mvp @performance
  Scenario: TTS 性能指標驗證
    Given I have a 50-character text response
    When I trigger Fast-TTS synthesis
    Then the P50 latency should be ≤ 1.5 seconds
    And the P95 latency should be ≤ 2.5 seconds
    And when I trigger HQ-TTS synthesis
    Then the synthesis should complete within 10 seconds (excluding model loading)
```

---

### Feature 3: 聲音克隆 (Voice Cloning)

**檔案名稱**: `features/voice_cloning.feature`

**對應 PRD**: [US-201, US-202, US-203](./02_project_brief_and_prd.md#核心史詩-2-core-epic-聲音克隆-voice-cloning)

```gherkin
# Feature: 零樣本聲音克隆
# 目的: 允許使用者上傳聲音樣本並用於 TTS 合成
# 對應 PRD: US-201, US-202, US-203

Feature: Zero-shot Voice Cloning

  Background:
    Given I am on the voice management page
    And the system supports voice cloning via HQ-TTS

  @mvp @happy-path @smoke-test
  Scenario: 成功上傳聲音樣本進行克隆
    Given I have a voice sample file "sample_voice.wav" (duration: 15 seconds)
    When I upload the file via the voice upload interface
    Then the system should validate the file format (WAV/MP3)
    And the system should display upload progress
    And the system should extract voice embedding successfully
    And the voice profile should be saved as "New Voice Profile"
    And I should see a success message "聲音樣本已成功上傳並處理"

  @mvp @happy-path
  Scenario: 使用克隆聲音進行對話
    Given I have uploaded a voice profile "My_Voice"
    And I am in the chat interface
    When I select the voice profile "My_Voice" from the dropdown
    And the AI generates a response "這是測試語音克隆效果"
    And I trigger HQ-TTS synthesis
    Then the synthesized audio should use the "My_Voice" characteristics
    And the voice should sound similar to the original sample (subjective score ≥ 7/10)
    And Taiwanese accent should be preserved if present in the sample

  @mvp @happy-path
  Scenario: 管理多個聲音樣本
    Given I have uploaded 3 voice profiles: "Voice_A", "Voice_B", "Voice_C"
    When I go to the voice management page
    Then I should see a list of all 3 voice profiles
    And each profile should display: name, upload date, duration, preview button
    When I click the preview button for "Voice_A"
    Then the system should play a short audio sample using "Voice_A"

  @mvp @happy-path
  Scenario: 刪除聲音樣本
    Given I have a voice profile "Old_Voice" that I no longer need
    When I click the delete button for "Old_Voice"
    Then the system should ask for confirmation "確定要刪除此聲音樣本嗎？"
    When I confirm the deletion
    Then the voice profile "Old_Voice" should be removed from the list
    And the associated files should be deleted from MinIO storage
    And I should see a message "聲音樣本已刪除"

  @mvp @sad-path
  Scenario: 上傳檔案格式不支援
    Given I have a video file "sample.mp4"
    When I try to upload the file
    Then the system should reject the upload immediately
    And I should see an error message "不支援的檔案格式,請上傳 WAV 或 MP3"

  @mvp @sad-path
  Scenario: 上傳音檔時長過短
    Given I have a 2-second voice sample
    When I upload the file
    Then the system should accept the upload but display a warning
    And the warning should say "建議上傳 5-30 秒的音檔以獲得更佳克隆效果"

  @mvp @edge-case
  Scenario: 音檔包含背景音樂或噪音
    Given I upload a voice sample with background music
    When the system processes the embedding
    Then the system should attempt to extract voice features
    But the system should log a warning about audio quality
    And the cloning result quality may be degraded

  @mvp @performance
  Scenario: 聲音樣本處理性能
    Given I upload a 20-second voice sample (WAV, 16kHz)
    When the system starts processing
    Then the embedding extraction should complete within 5 seconds
    And the profile should be ready for use immediately after
```

---

### Feature 4: 語音分析 (Voice Analysis)

**檔案名稱**: `features/voice_analysis.feature`

**對應 PRD**: [US-301, US-302](./02_project_brief_and_prd.md#核心史詩-3-core-epic-語音分析-voice-analysis)

```gherkin
# Feature: 語音品質分析與報告
# 目的: 提供使用者語音表現的量化分析
# 對應 PRD: US-301, US-302

Feature: Voice Quality Analysis and Reporting

  Background:
    Given the system has recorded user voice input
    And the voice analysis module (openSMILE + Parselmouth) is running

  @mvp @happy-path @smoke-test
  Scenario: 自動分析語音韻律特徵
    Given I have spoken a sentence "今天是個好日子"
    When the STT completes transcription
    Then the system should asynchronously trigger prosody analysis
    And the analysis should extract the following features:
      | Feature        | Description              |
      | f0_mean        | 平均音高                 |
      | f0_range       | 音高範圍                 |
      | jitter         | 音高抖動（穩定度指標）    |
      | shimmer        | 振幅抖動（平穩度指標）    |
      | speech_rate    | 語速（音節/秒）          |
      | pause_ratio    | 停頓比                   |
      | HNR            | 諧噪比（音質指標）        |
    And the analysis should complete within 2 seconds on CPU

  @mvp @happy-path
  Scenario: 顯示語音品質分數
    Given the prosody analysis has completed
    When I view the analysis report
    Then I should see the following scores (0-100 scale):
      | Metric      | Description              |
      | Confidence  | 自信度（基於音高穩定性）  |
      | Stability   | 平穩度（基於 jitter/shimmer）|
      | Affability  | 親和力（基於音調變化）    |
    And each score should have a visual indicator (progress bar/gauge)
    And the score should be compared to my historical average

  @mvp @happy-path
  Scenario: 查看語音分析詳細報告
    Given I have completed a conversation with 10 turns
    When I click "查看語音分析報告"
    Then I should see a detailed report including:
      - Overall summary scores
      - Per-turn score breakdown
      - Speech rate trend chart
      - F0 contour visualization
      - Pause pattern analysis
    And I should be able to export the report as PDF

  @mvp @happy-path
  Scenario: 歷史分數趨勢追蹤
    Given I have used the system for 5 sessions over 5 days
    When I go to the voice analytics dashboard
    Then I should see trend charts for:
      - Confidence score over time
      - Stability score over time
      - Affability score over time
    And I should be able to filter by date range
    And the system should highlight improvement or decline

  @mvp @sad-path
  Scenario: 音訊品質過低導致分析不準確
    Given the recorded audio has high background noise (SNR < 5dB)
    When the prosody analysis runs
    Then the system should detect the poor audio quality
    And the analysis results should be flagged as "低信度"
    And the user should see a warning "音訊品質較差,分析結果可能不準確"

  @mvp @edge-case
  Scenario: 極短語音片段分析
    Given I speak only 1 word "好"
    When the prosody analysis runs
    Then the system should attempt analysis but with limited features
    And some metrics (like speech_rate) should be marked as "N/A"
    And the system should suggest "建議提供較長語音片段以獲得準確分析"

  @post-mvp @performance
  Scenario: 批次語音分析性能
    Given I have 100 recorded voice clips from a conversation
    When I trigger batch analysis
    Then the system should process all clips in parallel on CPU
    And the total processing time should be < 60 seconds
    And the system should not block the main conversation flow
```

---

### Feature 5: 對話管理 (Conversation Management)

**檔案名稱**: `features/conversation_management.feature`

**對應 PRD**: [US-103](./02_project_brief_and_prd.md#核心史詩-1-core-epic-語音輸入與對話-voice-input--conversation)

```gherkin
# Feature: 對話歷史與上下文管理
# 目的: 保存對話記錄並提供多輪對話上下文
# 對應 PRD: US-103

Feature: Conversation History and Context Management

  Background:
    Given I am logged into the system
    And I have an active conversation session

  @mvp @happy-path @smoke-test
  Scenario: 查看對話歷史記錄
    Given I have completed a conversation with 5 turns
    When I navigate to the chat history page
    Then I should see all 5 conversation turns displayed chronologically
    And each turn should show:
      - User input (text transcription)
      - AI response (text)
      - Timestamp
      - Audio playback buttons for both user and AI
    And I should be able to scroll through the history

  @mvp @happy-path
  Scenario: 重新播放歷史語音
    Given I am viewing the chat history
    When I click the audio playback button for a previous AI response
    Then the system should retrieve the audio file from MinIO
    And the audio should play successfully
    And the playback should use the original TTS mode (Fast or HQ)

  @mvp @happy-path
  Scenario: 多輪對話上下文保持
    Given I have started a new conversation
    When I say "我叫張三"
    Then the AI should respond acknowledging my name
    When I later ask "我叫什麼名字?"
    Then the AI should correctly respond "你叫張三"
    And the system should maintain conversation context up to 4096 tokens

  @mvp @happy-path
  Scenario: 開始新對話
    Given I am in an active conversation
    When I click "開始新對話"
    Then the system should ask for confirmation "確定要結束當前對話並開始新的嗎？"
    When I confirm
    Then the current conversation should be saved to history
    And a new conversation session should be created
    And the conversation context should be reset

  @mvp @sad-path
  Scenario: 對話歷史載入失敗
    Given the database connection is temporarily unavailable
    When I try to view chat history
    Then I should see an error message "無法載入對話歷史,請稍後再試"
    And the system should retry the connection 3 times
    And the error should be logged with trace ID

  @mvp @edge-case
  Scenario: 長對話上下文管理（超過 token 限制）
    Given I have a conversation with 100 turns
    And the conversation has exceeded 4096 tokens
    When I send a new message
    Then the system should automatically truncate old context
    And the system should keep the most recent 3000 tokens
    And the system should prepend a summary of earlier conversation
    And the user should see a note "早期對話已歸檔"

  @mvp @performance
  Scenario: 對話歷史查詢性能
    Given the database contains 1000 conversation sessions
    When I search for conversations from "last 7 days"
    Then the query should complete within 500ms
    And the results should be paginated (20 per page)
    And I should be able to filter by date range or keyword
```

---

## Ⅳ. 最佳實踐

### 1. Scenario 設計原則

*   **單一職責**: 一個 Scenario 只測試一件事,保持簡潔
*   **可讀性優先**: 使用陳述式而非命令式
    *   ✅ `Then I should be redirected to the dashboard`
    *   ❌ `Then the system redirects me to the dashboard`
*   **避免實現細節**: 關注行為而非技術細節
    *   ✅ `When I confirm my order`
    *   ❌ `When I click the green button with id "btn-confirm"`
*   **使用業務語言**: 讓非技術人員也能理解

### 2. 數據管理

*   使用 `Scenario Outline` 處理多組數據測試
*   在 `Background` 中準備共用的前置條件
*   避免硬編碼測試數據,使用變數或配置

### 3. 標籤使用

*   `@mvp`: 標記 MVP 必須實現的功能
*   `@smoke-test`: 標記冒煙測試,用於快速驗證
*   `@performance`: 標記性能測試,需要特殊環境
*   `@wip`: 標記開發中的功能,可在 CI 中跳過

### 4. 性能測試場景

對於性能敏感的功能（如 STT、TTS、LLM），應該:
*   明確定義性能目標（P50、P95 延遲）
*   測試極限負載（並發會話數）
*   測試資源限制情況（VRAM 使用率）

---

## Ⅴ. LLM Prompting 指南

### 如何使用 BDD Scenarios 指導 AI 編碼

當你要求 LLM 根據 BDD scenarios 生成程式碼時,使用以下 prompt 模板:

```
請根據以下 BDD 情境,使用 Clean Architecture 和 TDD 方法,為我生成程式碼:

情境:
[貼上 Gherkin Scenario]

要求:
1. 使用 Python/FastAPI 框架
2. 遵循 Clean Architecture 分層:
   - Domain Layer: 定義核心業務實體
   - Application Layer: 實現 Use Case
   - Infrastructure Layer: 實現外部依賴（資料庫、API）
3. 先生成失敗的測試用例（Red）
4. 再實現最小可行的功能（Green）
5. 使用 pytest 作為測試框架
6. 使用 Pydantic 進行資料驗證

請產出:
- 測試檔案: tests/test_[feature].py
- Use Case 實現: app/application/use_cases/[use_case].py
- Domain 實體: app/domain/entities/[entity].py
- API 端點: app/api/endpoints/[endpoint].py
```

### 範例: 根據 Voice Input Scenario 生成程式碼

```
Scenario: 成功進行語音輸入並獲得即時轉錄
  Given I click the microphone button to start recording
  When I speak the sentence "今天天氣真好"
  Then I should see partial transcription updates in real-time
  And the final transcription should display "今天天氣真好"
  And the transcription latency should be less than 600ms
```

**生成的程式碼結構**:
```
app/
├── domain/
│   └── entities/
│       └── transcription.py  # Transcription entity
├── application/
│   └── use_cases/
│       └── transcribe_audio.py  # TranscribeAudioUseCase
├── infrastructure/
│   ├── stt/
│   │   └── faster_whisper_adapter.py  # STT implementation
│   └── websocket/
│       └── transcription_stream.py  # WebSocket handler
└── api/
    └── endpoints/
        └── voice.py  # Voice API endpoints

tests/
└── test_voice_input.py  # BDD scenario tests
```

---

## 附錄 A: Feature File 組織結構

建議的 Feature files 目錄結構:

```
features/
├── voice_input.feature          # 語音輸入
├── voice_output.feature         # 語音輸出
├── voice_cloning.feature        # 聲音克隆
├── voice_analysis.feature       # 語音分析
├── conversation_management.feature  # 對話管理
├── system_monitoring.feature    # 系統監控（Post-MVP）
└── steps/                       # Step definitions (Python)
    ├── voice_input_steps.py
    ├── voice_output_steps.py
    ├── voice_cloning_steps.py
    ├── voice_analysis_steps.py
    └── common_steps.py
```

---

## 附錄 B: 測試框架建議

### Python BDD 框架選擇

推薦使用 **pytest-bdd** 或 **behave**:

**pytest-bdd** 優勢:
- 與 pytest 生態系統無縫整合
- 支援 fixture 和 parametrize
- 測試報告豐富

**behave** 優勢:
- 專為 BDD 設計
- 語法更貼近 Gherkin
- 社群成熟

### 測試執行策略

```bash
# 執行所有 MVP 測試
pytest -m mvp

# 執行冒煙測試
pytest -m smoke_test

# 執行特定 Feature
pytest tests/test_voice_input.py

# 執行並生成覆蓋率報告
pytest --cov=app --cov-report=html

# 執行性能測試（需特定環境）
pytest -m performance --benchmark-only
```

---

**審核記錄 (Review History):**

| 日期 | 審核人 | 版本 | 變更摘要/主要反饋 |
| :--- | :--- | :--- | :--- |
| 2025-11-01 | [VibeCoding AI] | v1.0 | 初稿完成,包含 5 個核心 Feature files |
