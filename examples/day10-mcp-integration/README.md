# Day 10：整合本機與遠端 MCP Server

這個範例對應〈[Day 10 - MCP 實戰：讓 Agent 使用外部工具服務](../../day10/README.md)〉，示範如何透過 GitHub Copilot SDK Session 連接本機 Filesystem MCP Server 與遠端 Documentation MCP Server。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 具備 GitHub Copilot 使用資格的 GitHub 帳號
- 已完成 Copilot CLI 登入
- 遠端範例需要能連線至 `https://modelcontextprotocol.io/mcp`

## 安裝

在系列文章專案根目錄安裝所有相依套件：

```bash
npm install
```

如果尚未登入 Copilot CLI，執行：

```bash
npx copilot login
```

## 型別檢查

在系列文章專案根目錄執行：

```bash
npm run typecheck --workspace day10-mcp-integration
```

## 執行本機 MCP 範例

```bash
npm run start:local --workspace day10-mcp-integration
```

Runtime 會啟動 Filesystem MCP Server，將 `fixtures/` 設為允許目錄，並只納入 `list_directory` 與 `read_text_file`。如果 Agent 依照 Prompt 呼叫兩支工具，輸出會形成類似以下的事件與回答：

```text
[mcp:filesystem] start list_directory
[tool:<tool-call-id>] complete success=true
[mcp:filesystem] start read_text_file
[tool:<tool-call-id>] complete success=true

模型回應：
Project: Northstar
Runtime: Node.js 22
Database: PostgreSQL 17
Cache: Redis 8
Deployment: Kubernetes
```

## 執行遠端 MCP 範例

```bash
npm run start:remote --workspace day10-mcp-integration
```

Runtime 會透過 HTTP 連接 Model Context Protocol 官方網站的 Documentation MCP Server，並只納入 `search_model_context_protocol`：

```text
[mcp:docs] start search_model_context_protocol
[tool:<tool-call-id>] complete success=true

模型回應：
<assistant-response>
```

實際的 `toolCallId`、工具呼叫次數與自然語言回答會依模型判斷、Runtime 狀態及遠端文件內容而有所不同。驗證重點是指定 MCP Server 成功連線、限定的工具確實執行，以及回答使用工具取得的資料。

## 能力與權限範圍

- 兩個 Session 都透過 `availableTools: ["mcp:*"]` 排除非 MCP 工具。
- 本機 Server 的 `tools` 只納入兩支唯讀檔案工具，且允許目錄限定為範例的 `fixtures/`。
- 遠端 Server 的 `tools` 只納入公開文件搜尋工具。
- `approveAll` 是為了不中斷範例流程，不代表正式服務可以略過風險判斷。

## 範例限制

本機範例只讀取固定測試資料，但 Filesystem MCP Server 本身還提供寫入與移動檔案等工具；調整 `tools` 前應重新評估允許目錄、作業系統檔案權限與執行環境隔離。MCP Roots 也可能改變 Server 實際採用的允許目錄，因此正式服務應確認執行期間真正生效的範圍。

遠端 MCP Server 的可用性、工具名稱、Schema 與回傳內容由服務端維護。正式整合還需要處理認證資訊、Secret 管理、網路逾時、重試、工具版本變更、資源授權、敏感資料過濾與監控告警。
