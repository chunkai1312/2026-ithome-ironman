# Day 27：Agent 服務設計

這個範例對應〈[Day 27 - Agent 服務設計：Session 模型與服務邊界](../../day27/README.md)〉，示範如何以 Express 建立最小 Agent 服務，並將對外的 Application Session 與內部 Runtime Session 分開管理。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 依系列專案根目錄 `package-lock.json` 安裝的 `@github/copilot-sdk` 與 Express
- 可以 Headless Server 模式執行的 Copilot CLI
- OpenAI 或相容服務的模型名稱、API URL 與 API Key

## 安裝與型別檢查

在系列文章專案根目錄執行：

```bash
npm install
npm run typecheck --workspace day27-agent-service
```

如果將範例複製成一般獨立專案，可以在範例目錄執行 `npm install`。

## 設定 BYOK

範例從服務端環境讀取設定，不會自動載入 `.env`。可參考 `.env.example`，在啟動 Agent 服務的終端機匯出：

```bash
export COPILOT_RUNTIME_URL="localhost:4321"
export PORT="3000"
export MODEL_BASE_URL="https://api.openai.com/v1"
export MODEL_API_KEY="<api-key>"
export MODEL_ID="<model-id>"
```

## 執行

先在第一個終端機啟動 External Runtime：

```bash
copilot --headless --port 4321
```

再從系列文章專案根目錄啟動 Agent 服務：

```bash
npm run start --workspace day27-agent-service
```

在一般獨立專案中執行：

```bash
npx tsx src/server.ts
```

服務預設監聽 `http://localhost:3000`，需要避開既有服務時可以透過 `PORT` 調整。

## 呼叫 API

建立 Application Session：

```bash
curl -X POST http://localhost:3000/api/sessions
```

回應只包含產品對外使用的 Session ID 與建立時間：

```json
{
  "id": "session_<uuid>",
  "createdAt": "<ISO 8601 time>"
}
```

使用實際取得的 ID 查詢 Session：

```bash
curl http://localhost:3000/api/sessions/session_<uuid>
```

在相同 Session 送出訊息：

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"請用三點整理 Agent 服務需要注意的工程問題。"}' \
  http://localhost:3000/api/sessions/session_<uuid>/messages
```

回應格式如下，自然語言內容會依模型而不同：

```json
{
  "sessionId": "session_<uuid>",
  "content": "<模型回應>"
}
```

## 觀察重點

- 用戶端只取得 Application Session ID；`ownerId`、Runtime Session ID 與 BYOK 認證資訊都留在服務端。
- API 先透過 `getOwnedSession()` 完成 Session 歸屬檢查，再操作 Runtime Session。
- External Runtime 使用 `mode: "empty"`，每段 Session 也明確設為 `availableTools: []`。
- `createSession()` 與 `resumeSession()` 會在需要時建立 Runtime 連線，不需要額外呼叫 `client.start()`。
- 同一個 Application Session 正在處理訊息時，另一筆訊息請求會收到 `409 Conflict`。

## 範例邊界

範例以固定的 `demo-user` 代表已完成驗證的登入者，Application Session 與執行中 Session 都只保存在目前程序的記憶體。正式服務需要接上既有身分驗證、持久化儲存與跨實例的並行控制，也不能信任用戶端自行提供的使用者 ID。
