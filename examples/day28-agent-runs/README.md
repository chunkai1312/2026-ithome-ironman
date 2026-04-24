# Day 28：Application Run、事件串流與取消

這個範例對應〈[Day 28 - 長任務執行設計：Application Run、事件串流與取消](../../day28/README.md)〉，示範如何把 Agent 工作從原始 HTTP 請求拆成可查詢、可透過 SSE 串流，並可要求取消的 Application Run。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 依系列專案根目錄 `package-lock.json` 安裝的 `@github/copilot-sdk` 與 Express
- 可以 Headless Server 模式執行的 Copilot CLI
- OpenAI 或相容服務的模型名稱、API URL 與 API Key

## 安裝與型別檢查

在系列文章專案根目錄執行：

```bash
npm install
npm run typecheck --workspace day28-agent-runs
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
npm run start --workspace day28-agent-runs
```

在一般獨立專案中執行：

```bash
npx tsx src/server.ts
```

服務預設監聽 `http://localhost:3000`，需要避開既有服務時可以透過 `PORT` 調整。

## 建立 Session 與 Run

建立 Application Session：

```bash
curl -sS -X POST http://localhost:3000/api/sessions
```

保存回應中的 Application Session ID：

```bash
export SESSION_ID="session_<uuid>"
```

建立 Application Run：

```bash
curl -sS -X POST \
  -H "Content-Type: application/json" \
  -d '{"prompt":"請用五點整理長任務 Agent 服務的主要工程風險。"}' \
  "http://localhost:3000/api/sessions/$SESSION_ID/runs"
```

訊息送入 Runtime 後，API 會以 `202 Accepted` 回傳 Run 資源。將其中的 ID 保存起來：

```bash
export RUN_ID="run_<uuid>"
```

## 查詢與串流 Run

查詢 Run 目前狀態：

```bash
curl -sS "http://localhost:3000/api/runs/$RUN_ID"
```

透過 SSE 取得已保存的事件並持續接收新事件：

```bash
curl -N "http://localhost:3000/api/runs/$RUN_ID/events"
```

執行期間會先收到 `run.started`，接著收到多筆 `run.output.delta`，最後以 `run.completed`、`run.failed` 或 `run.cancelled` 結束。

若連線中斷前最後處理的 SSE ID 是 `3`，可以只補送後續事件：

```bash
curl -N \
  -H "Last-Event-ID: 3" \
  "http://localhost:3000/api/runs/$RUN_ID/events"
```

## 取消 Run

Run 尚未結束時呼叫：

```bash
curl -sS -X POST \
  "http://localhost:3000/api/runs/$RUN_ID/cancel"
```

Application Run 會先進入 `cancelling`，等 Runtime 送出帶有 `aborted: true` 的 `session.idle` 後，再進入 `cancelled`。如果 Agent 已先自然完成，取消 API 可能回傳 `409 Conflict`，Run 也會維持實際的完成狀態。

## 觀察重點

- `POST /runs` 只等待 `session.send()` 接受訊息，不等待整段 Agent 工作完成。
- Application Run 保存產品狀態；Runtime 訊息 ID 與原始 Session 事件不會進入產品 API。
- `assistant.message_delta` 轉成產品自己的 `run.output.delta` SSE 事件。
- Run 事件先保存在記憶體，再通知 SSE 訂閱者，因此可以補送連線建立前的事件。
- 同一個 Application Session 同時間最多只有一筆未結束的 Run，重複建立會收到 `409 Conflict`。
- `session.abort()` 只要求中止目前 Runtime 工作，不會回滾 Tool 已經完成的外部副作用。
- `createSession()` 與 `resumeSession()` 會在需要時建立 Runtime 連線，不需要額外呼叫 `client.start()`。

## 範例邊界

範例以固定的 `demo-user` 代表已完成驗證的登入者。Application Session、Application Run、事件紀錄與並行控制都只存在目前 Node.js 程序的記憶體；正式服務需要接上身分驗證、持久化儲存、跨實例協調與事件保留政策。
