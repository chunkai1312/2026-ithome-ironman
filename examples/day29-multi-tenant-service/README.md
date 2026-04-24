# Day 29：多租戶 Agent 服務

這個範例對應〈[Day 29 - 多租戶 Agent 服務：Session 隔離與 Runtime 路由](../../day29/README.md)〉，示範如何加入租戶與使用者邊界、Application Run Queue、兩個 Worker，以及採 Round-robin 分配的 External Runtime Pool。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 依系列專案根目錄 `package-lock.json` 安裝的 `@github/copilot-sdk` 與 Express
- 可以 Headless Server 模式執行的 Copilot CLI
- OpenAI 或相容服務的模型名稱、API URL 與 API Key

## 安裝與型別檢查

在系列文章專案根目錄執行：

```bash
npm install
npm run typecheck --workspace day29-multi-tenant-service
```

如果將範例複製成一般獨立專案，可以在範例目錄執行 `npm install`。

## 設定 Runtime Pool 與 BYOK

範例從服務端環境讀取設定，不會自動載入 `.env`。可參考 `.env.example`，在啟動 Agent 服務的終端機匯出：

```bash
export COPILOT_RUNTIME_1_URL="localhost:4321"
export COPILOT_RUNTIME_2_URL="localhost:4322"
export PORT="3000"
export MODEL_BASE_URL="https://api.openai.com/v1"
export MODEL_API_KEY="<api-key>"
export MODEL_ID="<model-id>"
```

## 執行

分別在兩個終端機啟動 External Runtime：

```bash
copilot --headless --port 4321
```

```bash
copilot --headless --port 4322
```

再從系列文章專案根目錄啟動 Agent 服務：

```bash
npm run start --workspace day29-multi-tenant-service
```

在一般獨立專案中執行：

```bash
npx tsx src/server.ts
```

服務預設監聽 `http://localhost:3000`，需要避開既有服務時可以透過 `PORT` 調整。

## 示範身分

範例只接受以下兩組 Header：

| 租戶 | 使用者 |
| --- | --- |
| `tenant-a` | `user-a` |
| `tenant-b` | `user-b` |

每次請求都需要提供：

```text
X-Demo-Tenant-Id: tenant-a
X-Demo-User-Id: user-a
```

這些 Header 只用來選擇示範身分，不是真正的身分驗證機制。

## 建立 Session

使用 Tenant A 建立 Application Session：

```bash
curl -sS -X POST \
  -H "X-Demo-Tenant-Id: tenant-a" \
  -H "X-Demo-User-Id: user-a" \
  http://localhost:3000/api/sessions
```

建立第二個 Session 時，Round-robin 會將它分配到另一個 Runtime。API 不會暴露 Runtime 路由，但服務日誌會顯示：

```text
[runtime] session=session_<uuid> runtime=runtime-1
[runtime] session=session_<uuid> runtime=runtime-2
```

保存其中一個 Session ID：

```bash
export SESSION_ID="session_<uuid>"
```

## 驗證租戶隔離

使用 Tenant B 查詢 Tenant A 的 Session：

```bash
curl -i \
  -H "X-Demo-Tenant-Id: tenant-b" \
  -H "X-Demo-User-Id: user-b" \
  "http://localhost:3000/api/sessions/$SESSION_ID"
```

服務會回傳 `404 Not Found`，不會透露另一個租戶的 Session 是否存在。

## 建立 Run Queue

使用 Session 擁有者建立 Run：

```bash
curl -sS -X POST \
  -H "Content-Type: application/json" \
  -H "X-Demo-Tenant-Id: tenant-a" \
  -H "X-Demo-User-Id: user-a" \
  -d '{"prompt":"請整理多租戶 Agent 服務的三項重點。"}' \
  "http://localhost:3000/api/sessions/$SESSION_ID/runs"
```

API 會回傳 `202 Accepted` 與狀態為 `queued` 的 Application Run。Worker 取得工作後，狀態會進入 `running`。

同一個 Session 可以連續建立多筆 Run；後續 Run 會保持 `queued`，直到前一筆進入終止狀態。不同 Session 的 Run 則可以同時由 Worker 送往各自保存的 Runtime。

查詢與 SSE API 延續前一篇的契約，請求時同樣需要附上示範身分 Header：

```bash
curl -sS \
  -H "X-Demo-Tenant-Id: tenant-a" \
  -H "X-Demo-User-Id: user-a" \
  "http://localhost:3000/api/runs/run_<uuid>"
```

```bash
curl -N \
  -H "X-Demo-Tenant-Id: tenant-a" \
  -H "X-Demo-User-Id: user-a" \
  "http://localhost:3000/api/runs/run_<uuid>/events"
```

## 觀察重點

- `tenantId` 與 `ownerId` 形成 Application Session 的產品存取邊界。
- `runtimeId` 與 `runtimeSessionId` 共同保存固定 Runtime 路由，而且不會回傳給用戶端。
- `claimNextRun()` 只取得 `queued` Run，並在目前 Session 沒有執行中 Run 時才完成 claim。
- 同一 Session 的 Run 依序進入 Runtime；不同 Session 可以並行。
- 排隊中的 Run 可以直接取消，已開始執行的 Run 則透過 `session.abort()` 中止。
- Runtime Pool 啟動時會明確連接兩個 External Runtime。

## 範例邊界

Session、Run、事件、Queue claim 與 Runtime 路由仍然保存在目前 Node.js 程序的記憶體。這只能驗證多租戶服務的責任與執行語意；正式多實例服務必須使用共享儲存與具備原子性的 claim／locking 機制，也必須以真正驗證過的身分取代示範 Header。
