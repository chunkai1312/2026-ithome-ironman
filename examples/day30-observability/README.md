# Day 30：OpenTelemetry 端到端執行追蹤

這個範例對應〈[Day 30 - Agent 服務可觀測性：OpenTelemetry 與執行追蹤](../../day30/README.md)〉，延續 Day 29 的多租戶 Agent 服務，示範如何讓 `application.run`、Copilot Runtime 的 Agent 執行，以及應用程式端的自訂工具 Span 串成同一條分散式 Trace。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 依系列專案根目錄 `package-lock.json` 安裝的相依套件
- 可以 Headless Server 模式執行的 Copilot CLI
- Docker，用來執行 OpenTelemetry Collector
- OpenAI 或相容服務的模型名稱、API URL 與 API Key

## 安裝與型別檢查

在系列文章專案根目錄執行：

```bash
npm install
npm run typecheck --workspace day30-observability
```

如果將範例複製成一般獨立專案，可以在範例目錄執行 `npm install`。

## 啟動 OpenTelemetry Collector

在這個範例目錄執行：

```bash
docker run --rm \
  -p 4318:4318 \
  -v "$PWD/otel-collector.yaml:/etc/otelcol/config.yaml:ro" \
  otel/opentelemetry-collector:0.135.0 \
  --config=/etc/otelcol/config.yaml
```

Collector 會在 `http://localhost:4318` 接收 OTLP HTTP Trace 與 Metrics，並透過 `debug` exporter 將收到的遙測摘要顯示在終端機。這項設定只用於觀察範例資料，不包含正式環境需要的儲存與查詢後端。

## 啟動 External Runtime

分別在兩個終端機啟動 Runtime。範例明確啟用 OpenTelemetry、指定 OTLP Endpoint，並關閉完整 Prompt、Response 與 Tool 內容擷取。這些環境變數必須在 Runtime 程序啟動時就存在；如果 Port 已經有舊 Runtime 監聽，需要先停止舊程序再執行以下命令，事後才設定環境變數不會改變既有程序。

第一個 Runtime：

```bash
COPILOT_OTEL_ENABLED="true" \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318" \
OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf" \
OTEL_SERVICE_NAME="copilot-runtime-1" \
OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT="false" \
copilot --headless --port 4321
```

第二個 Runtime：

```bash
COPILOT_OTEL_ENABLED="true" \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318" \
OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf" \
OTEL_SERVICE_NAME="copilot-runtime-2" \
OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT="false" \
copilot --headless --port 4322
```

## 設定 Agent 服務

範例從服務端環境讀取設定，不會自動載入 `.env`。可參考 `.env.example`，在啟動服務的終端機匯出：

```bash
export COPILOT_RUNTIME_1_URL="localhost:4321"
export COPILOT_RUNTIME_2_URL="localhost:4322"
export PORT="3000"
export MODEL_BASE_URL="https://api.openai.com/v1"
export MODEL_API_KEY="<api-key>"
export MODEL_ID="<model-id>"
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://localhost:4318/v1/traces"
```

`MODEL_API_KEY` 只交給 Runtime 的 BYOK Provider，不會寫入 Trace。Agent 服務使用 `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` 匯出自己建立的 Span。

## 啟動 Agent 服務

在系列文章專案根目錄執行：

```bash
npm run start --workspace day30-observability
```

在一般獨立專案中執行：

```bash
npx tsx src/server.ts
```

服務預設監聽 `http://localhost:3000`，需要避開既有服務時可以透過 `PORT` 調整。

## 建立 Session 與 Run

範例接受 `tenant-a`／`user-a` 與 `tenant-b`／`user-b` 兩組示範身分。先建立 Tenant A 的 Application Session：

```bash
curl -sS -X POST \
  -H "X-Demo-Tenant-Id: tenant-a" \
  -H "X-Demo-User-Id: user-a" \
  http://localhost:3000/api/sessions
```

將回傳的真實 Session ID 保存到環境變數：

```bash
export SESSION_ID="session_<uuid>"
```

建立一筆明確要求呼叫固定資料工具的 Run：

```bash
curl -sS -X POST \
  -H "Content-Type: application/json" \
  -H "X-Demo-Tenant-Id: tenant-a" \
  -H "X-Demo-User-Id: user-a" \
  -d '{
    "prompt": "請務必使用 get_service_status 查詢 checkout-api，再根據工具實際回傳的資料整理目前服務狀態與需要注意的問題；不要自行補充工具沒有提供的資訊。"
  }' \
  "http://localhost:3000/api/sessions/$SESSION_ID/runs"
```

將回傳的 Run ID 保存後查詢結果：

```bash
export RUN_ID="run_<uuid>"
curl -sS \
  -H "X-Demo-Tenant-Id: tenant-a" \
  -H "X-Demo-User-Id: user-a" \
  "http://localhost:3000/api/runs/$RUN_ID"
```

也可以訂閱從目前事件序號之後開始的 SSE：

```bash
curl -N \
  -H "X-Demo-Tenant-Id: tenant-a" \
  -H "X-Demo-User-Id: user-a" \
  "http://localhost:3000/api/runs/$RUN_ID/events"
```

## 觀察 Trace

Agent 完成工作並等待匯出後，Collector 終端機應該會出現來自 `copilot-agent-service` 與 `copilot-runtime-1` 或 `copilot-runtime-2` 的資料。模型是否呼叫工具會影響實際 Span 數量；當工具確實被使用時，可以檢查以下關係：

```text
application.run
└── invoke_agent
    ├── chat
    ├── execute_tool
    │   └── tool.get_service_status
    └── chat
```

依 Copilot SDK 的 Trace Context 介面契約，這些 Span 應具有相同的 Trace ID，並透過 Parent Span ID 形成父子關係。`application.run` 還會包含 `app.run.id`、`app.session.id`、`app.worker.id`、`runtime.id` 與 `app.run.queue_wait_ms`；Runtime 另外輸出模型、Token、工具與 Turn 相關的 Trace 或 Metrics。

在 `2026-08-25` 以 `@github/copilot-sdk` `1.0.9` 與 Copilot CLI `1.0.80` 實際執行這個範例時，`onGetTraceContext` 會在 `session.send()` 前取得 `application.run` 的 `traceparent`，但 Collector 仍會將 `invoke_agent` 顯示成另一個 Trace 的 Root Span。Runtime 傳回工具端的 Context 則能正常運作，`tool.get_service_status` 會和 `execute_tool` 使用相同的 Trace ID，Parent Span ID 也會指向 `execute_tool`。因此，驗證時要以 Collector 的 Trace ID 與 Parent Span ID 為準；目前版本不能只根據 `onGetTraceContext` 已設定，就認定 Application 與 Runtime 一定形成同一條 Trace。

Collector 的 `debug` exporter 使用 `verbosity: basic`，主要用來確認資料已經進入管線。若要逐筆檢查 Span 名稱、Trace ID、Parent Span ID 與 Attribute，可以暫時將 `otel-collector.yaml` 中的 `verbosity` 改為 `detailed` 後重新啟動 Collector。

## 範例限制

- Session、Run Queue 與事件都保存在記憶體中，重啟服務後會消失。
- 兩個 Worker 與 Runtime Pool 只用來呈現責任邊界，沒有跨程序 Queue、租約、重試或故障轉移。
- 示範 Header 不是真正的 Authentication；正式服務必須從可信任的身分驗證結果建立 Tenant Context。
- Collector 只使用 `debug` exporter，不是正式的遙測儲存方案。
- 完整 Prompt、Response 與 Tool Input／Output 維持關閉，避免將敏感內容送進可觀測性後端。
