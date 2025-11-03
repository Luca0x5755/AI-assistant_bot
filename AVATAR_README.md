# AVATAR - AI Voice Assistant MVP

> **核心理念**: 在單機有限資源（RTX 4090 24GB）下，實現低延遲（≤3秒）的全地端 AI 語音對話助手

<div align="center">

**FastAPI 單服務 + SQLite + 本地音檔 + 3 個 AI 模型（STT/LLM/TTS）**

</div>

---

## 🎯 專案目標

**核心問題**: 在單機有限資源（RTX 4090 24GB）下，實現低延遲（≤3秒）的全地端 AI 語音對話助手

**目標用戶**:
1. 需要隱私保護的企業（金融、醫療、法律）
2. 對延遲敏感的應用場景（客服、培訓）
3. 語音品質有要求的內容創作者

**成功指標（KPIs）**:
- ✅ **E2E 延遲**: P95 ≤ 3.5 秒（50 字回應）
- ✅ **系統穩定性**: 連續 2 小時 5 並發無 OOM
- ✅ **音質滿意度**: 聲音克隆相似度主觀評分 ≥ 7/10

---

## ⚡ 快速開始

### 前置需求

- **Python**: 3.11 或 3.12
- **CUDA**: 12.1+（系統安裝，當前: 12.5/12.7）
- **GPU**: RTX 3090 24GB（compute capability 8.6）
- **RAM**: 32GB+

### 安裝步驟

#### 1. 安裝 Poetry

```bash
# Linux / macOS / WSL (推薦開發環境)
curl -sSL https://install.python-poetry.org | python3 -
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Windows (PowerShell)
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | py -
```

#### 2. 配置與安裝依賴

```bash
# 配置 Poetry
poetry config virtualenvs.in-project true

# 安裝基礎依賴
poetry install --no-root

# 激活虛擬環境
poetry env activate  # 執行顯示的命令
# 或: source .venv/bin/activate (Linux/macOS/WSL)
# 或: .venv\Scripts\activate (Windows)
```

#### 3. 安裝 PyTorch (CUDA)

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

#### 4. 安裝 AI 模型套件

```bash
pip install vllm>=0.6.0
pip install faster-whisper

# F5-TTS 與 CosyVoice3 參考官方 repo 安裝
```

#### 5. 驗證安裝

```bash
python scripts/validate_setup.py
```

預期輸出：
```
✅ FastAPI: 0.104.0
✅ PyTorch: 2.x.x+cu121
✅ CUDA Available: True
✅ GPU: NVIDIA RTX 4090
```

---

## 🏗️ 專案架構

### 一句話架構

**FastAPI 單服務 + SQLite + 本地音檔 + 3 個 AI 模型（STT/LLM/TTS）調用**

### 核心流程

```
1. 用戶語音 → Whisper 轉文字 (≤600ms)
2. 文字 → vLLM 生成回應 (TTFT ≤800ms)
3. 回應 → F5-TTS 快速合成 (≤1.5s) → 立即播放
4. 背景 → CosyVoice 高質合成 (5-10s) → 覆蓋歷史記錄
```

### 資源分配

```
VRAM 24GB:
├── vLLM (常駐): 9-12GB
├── TTS (按需): 1-4GB
└── 余量: 8-14GB (並發/KV cache)

CPU/RAM:
├── Whisper: 8 cores, 8GB RAM
├── FastAPI: 4 cores, 4GB RAM
└── SQLite: 輕量級
```

---

## 📂 目錄結構

```
avatar/
├── app/
│   ├── main.py              # FastAPI 入口
│   ├── websocket.py         # WebSocket 處理
│   ├── api/
│   │   ├── chat.py          # REST API
│   │   └── voice.py
│   ├── services/
│   │   ├── stt.py           # Whisper 調用
│   │   ├── llm.py           # vLLM 調用
│   │   └── tts.py           # TTS 調用
│   ├── db.py                # SQLite 操作
│   └── config.py            # 配置管理
├── audio/                   # 音檔存儲
├── scripts/
│   ├── download_models.py   # 模型下載腳本
│   └── validate_setup.py    # 環境驗證腳本
├── frontend/                # React 前端
├── pyproject.toml           # Poetry 專案配置
└── README.md                # 本文件
```

---

## 🚀 運行專案

### 啟動後端服務

```bash
# 方法 1: 使用 Poetry run
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 方法 2: 在激活環境後直接執行
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 啟動前端（新終端）

```bash
cd frontend
npm install  # 首次執行
npm run dev
```

### 健康檢查

```bash
curl http://localhost:8000/health
```

預期輸出：
```json
{
  "status": "healthy",
  "models": {
    "vllm": "running",
    "whisper": "ready",
    "tts": "ready"
  }
}
```

---

## 📊 API 端點

### WebSocket API

**連接 URL**: `ws://localhost:8000/ws/chat`

| 消息類型 | 方向 | 說明 |
|:---|:---|:---|
| `audio_chunk` | Client → Server | 語音片段（300ms） |
| `transcription` | Server → Client | 轉錄結果 |
| `llm_token` | Server → Client | LLM 流式輸出 |
| `audio_response` | Server → Client | TTS 音頻（fast/hq） |
| `error` | Server → Client | 錯誤訊息 |

### REST API

| 方法 | 路徑 | 說明 |
|:---|:---|:---|
| POST | `/api/voice-profile` | 上傳聲音樣本 |
| GET | `/api/voice-profiles` | 列出聲音檔案 |
| DELETE | `/api/voice-profile/{id}` | 刪除聲音檔案 |
| GET | `/api/conversations` | 獲取對話歷史 |
| GET | `/health` | 健康檢查 |

---

## 📚 完整文檔

### 核心文檔
- **[MVP 技術規格](docs/planning/mvp_tech_spec.md)** - 完整技術規格與決策記錄
- **[開發進度報告](docs/dev/development_progress_report.md)** - 開發進度與 Gantt 時間軸
- **[上線檢查清單](docs/launch/mvp_launch_checklist.md)** - 32 項上線前檢查
- **[文檔導覽](docs/README.md)** - 文檔體系與 Linus 式哲學

### 故障排除
- **[附錄 C - 故障排除](docs/planning/mvp_tech_spec.md#附錄-c故障排除與常見問題)** - 10 種常見問題與解決方案

---

## ⚠️ 風險與緩解

| 風險 | 嚴重性 | 緩解方案 |
|:---|:---|:---|
| **VRAM OOM** | 🔴 高 | 限流（最多 5 並發）+ 降級（純 Fast TTS） |
| **HQ-TTS 載入慢** | 🟡 中 | 預熱（啟動時預載）+ 通知（顯示載入進度） |
| **台式口音誤字** | 🟡 中 | 後處理（簡單糾錯）+ UI（可編輯轉錄文字） |
| **WebSocket 斷線** | 🟢 低 | 重連（Exponential Backoff）+ 恢復（會話狀態持久化） |

---

## 🎯 開發進度

### MVP 時程（4 週）

- **Week 1**: 核心流程打通（FastAPI + WebSocket + STT/LLM/TTS）
- **Week 2**: 聲紋管理 + 高質 TTS + 前端開發
- **Week 3**: 對話歷史 + 錯誤處理 + 性能優化
- **Week 4**: 測試 + 部署 + 上線準備

**當前進度**: Week 0 - 規劃階段完成 ✅

### 下一步

1. 環境準備與模型下載
2. FastAPI 專案初始化
3. WebSocket 連接處理

---

## 🔧 技術決策（ADR）

### 為什麼用 SQLite 而非 PostgreSQL？
- ✅ MVP 階段單機部署，不需要分佈式
- ✅ 零配置、零運維成本
- ✅ 性能足夠（< 1000 會話/天）

### 為什麼不用 Redis？
- ✅ 會話狀態可用內存管理（< 5 並發）
- ✅ TTS 任務佇列可用 Python asyncio.Queue
- ✅ 減少外部依賴，降低部署複雜度

### 為什麼用 Poetry 而非 pip？
- ✅ 依賴鎖定：`poetry.lock` 確保環境可複製
- ✅ 虛擬環境管理：自動建立與管理
- ✅ 依賴解析：避免 "dependency hell"

---

## 🤝 貢獻指南

本專案遵循 **Linus 式精簡哲學**：

> "Talk is cheap. Show me the code."

**核心原則**：
1. **Good Taste** - 消除邊界情況優於增加條件判斷
2. **Never Break Userspace** - 向後兼容性神聖不可侵犯
3. **Practicality Beats Purity** - 實用主義至上
4. **Simplicity is Prerequisite** - 簡潔執念

---

## 📜 授權

MIT License

---

## 📞 聯絡與支援

- **技術文檔**: [docs/planning/mvp_tech_spec.md](docs/planning/mvp_tech_spec.md)
- **故障排除**: [Appendix C - Troubleshooting](docs/planning/mvp_tech_spec.md#附錄-c故障排除與常見問題)
- **GitHub Issues**: [專案 Issues](https://github.com/your-repo/issues)

---

**最後更新**: 2025-11-01
**版本**: v0.1.0
**狀態**: MVP 規劃階段 ✅
