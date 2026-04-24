# Day 18：工具執行前控管

這個範例對應〈[Day 18 - 工具執行前控管：參數驗證與政策判斷](../../day18/README.md)〉，示範如何使用 `onPreToolUse` 在 Custom Tool 真正執行前驗證參數、縮小查詢範圍或拒絕超出政策邊界的操作。

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

```bash
npm run typecheck --workspace day18-pre-tool-policy
```

## 執行

```bash
npm run start --workspace day18-pre-tool-policy
```

範例會依序送出兩個查詢。

第一個查詢要求取得 `checkout-api` 的 staging 日誌，模型呼叫工具時使用 `windowMinutes=180` 與 `limit=500`。兩個值符合 Tool Schema，但超過目前政策，因此 Hook 會透過 `modifiedArgs` 縮小為 60 分鐘與 100 筆：

```text
[policy] modified windowMinutes=60 limit=100
[handler] service=checkout-api environment=staging windowMinutes=60 limit=100
```

第二個查詢要求取得 production 日誌。參數雖然符合 Tool Schema，但環境超出目前政策，Hook 會在 Handler 執行前拒絕：

```text
[policy] denied: 目前 Agent 工作流程不允許查詢 production 日誌。
```

第二段不應出現 `environment=production` 的 `[handler]` Log。Assistant 回答、Turn 數量與工具呼叫次數可能因模型而不同，驗證重點是政策與 Handler Log。

## 觀察重點

- `logQuerySchema` 同時定義工具參數並將 Hook 收到的 `unknown` 驗證成可信任的 `LogQuery`。
- 目前 Copilot CLI 可能將 Custom Tool 的 `toolArgs` 以 JSON 字串送進 Hook；範例會先安全解析，再交給 Zod Schema 驗證。
- `evaluateLogPolicy()` 是應用程式政策，不屬於 Copilot SDK。
- `modifiedArgs` 只縮小時間與筆數，不改變原本要查詢的服務與環境。
- production 不能被偷偷改成 staging，因此使用 `permissionDecision: "deny"` 保留失敗語意。
- `availableTools` 只開放 `query_service_logs`，工具使用固定記憶體資料且沒有副作用，因此設定 `skipPermission: true`。

## 範例邊界

Pre-Tool Policy 不能取代使用者身分、Tenant 與資源層級的 Authorization。真正連接日誌平台或內部 API 時，工具處理函式或底層服務仍需執行必要的授權檢查。
