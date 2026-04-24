# Day 09：讓 Agent 呼叫自訂工具

這個範例對應〈[Day 09 - 自訂工具實戰：讓 Agent 呼叫應用程式能力](../../day09/README.md)〉，示範如何使用 `defineTool()` 將應用程式內的固定天氣資料接進 Agent Runtime，並透過事件觀察工具執行結果。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 具備 GitHub Copilot 使用資格的 GitHub 帳號
- 已完成 Copilot CLI 登入

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
npm run typecheck --workspace day09-custom-tool
```

## 執行

在系列文章專案根目錄執行：

```bash
npm run start --workspace day09-custom-tool
```

程式會要求 Agent 使用 `get_weather` 查詢 Taipei。工具開始與完成事件使用相同的 `toolCallId`，最後再輸出 Assistant 根據固定資料整理的回答：

```text
[tool:<tool-call-id>] start name=get_weather
[tool:<tool-call-id>] complete success=true

模型回應：
台北的示範天氣資料為多雲，氣溫 30°C。
```

實際的 `toolCallId` 與自然語言回答會依執行結果而不同，模型也可能採用其他文字表達。驗證重點是 `get_weather` 確實完成執行，開始與完成事件可以透過 `toolCallId` 配對，而且回答內容使用 Handler 回傳的 `Cloudy` 與 `30°C`。

## 安全策略

Session 透過 `availableTools: ["custom:*"]` 只開放自訂工具來源。由於範例只註冊 `get_weather`，Agent 實際能使用的自訂工具也只有這一支。`get_weather` 只讀取程序內固定資料，不連接網路、不存取檔案，也不修改系統狀態，因此明確設定 `skipPermission: true`。

這項設定只適用於本範例。若 Handler 改成呼叫真實 API、資料庫或其他內部服務，就應移除 `skipPermission`，重新依照操作內容、使用者身分與資源範圍設計權限流程。

## 範例限制

範例中的城市天氣是固定測試資料，不代表即時資訊。程式沒有實作真實服務驗證、逾時、重試、角色授權、錯誤分類、敏感資料過濾、持久化、稽核儲存或正式服務需要的監控告警。

程式只示範正常流程中的 Session 與 Client 清理，沒有使用 `try...catch` 或 `try...finally`。若建立 Session、執行工具或等待回答時發生例外，後續的 `session.disconnect()` 與 `client.stop()` 可能不會執行；正式服務仍要處理資源回收、取消執行中的 Turn，以及網路與程序層級的異常終止。
