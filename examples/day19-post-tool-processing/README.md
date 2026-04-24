# Day 19：工具執行後處理

這個範例對應〈[Day 19 - 工具執行後處理：結果轉換與失敗引導](../../day19/README.md)〉，示範如何透過 `onPostToolUse` 整理成功結果，以及使用 `onPostToolUseFailure` 為失敗結果補充後續 Agent Loop 需要的 Context。

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
npm run typecheck --workspace day19-post-tool-processing
```

## 執行

```bash
npm run start --workspace day19-post-tool-processing
```

範例會依序查詢兩個固定服務。

`checkout-api` 會回傳成功結果。`onPostToolUse` 以 Zod 驗證原始資料後，只保留服務狀態需要的欄位，移除 `collectorNode`、`traceId` 與 `metricSource`，並補充這是目前時間點快照的 Context：

```text
[post-tool] success service=checkout-api

checkout-api:
<目前服務狀態>
```

`inventory-api` 會回傳 `resultType: "failure"`。這次不會進入成功 Hook，而是由 `onPostToolUseFailure` 取得錯誤並加入失敗後 Context：

```text
[post-tool] failure error=監控後端服務目前無法使用

inventory-api:
<目前無法判斷服務健康狀態>
```

自然語言回答與 Turn 數量可能因模型而不同。驗證重點是成功與失敗分別進入對應 Hook，成功回答不包含已移除的內部欄位，失敗回答也不會把缺少監控資料解讀為服務正常。

## 觀察重點

- 自訂工具直接回傳 `ToolResultObject`，穩定表達 `success` 與 `failure`。
- `modifiedResult` 取代完整成功結果，只讓後續 Agent Loop 取得目前工作需要的欄位。
- `additionalContext` 補充資料時效與解讀方式，不改變實際監控數值。
- `onPostToolUseFailure` 只處理 `resultType: "failure"`；目前不處理 `rejected`、`denied` 或 `timeout`。
- 工具只讀取程式內固定資料、沒有副作用，因此使用 `skipPermission: true`。

## 範例邊界

工具執行後的 Hook 只能改變 Agent 後續取得的結果，不能回滾已完成的外部副作用。資料授權也不應依賴事後移除欄位，真正的存取控制仍需在資料來源、工具 Handler 或執行前政策完成。
