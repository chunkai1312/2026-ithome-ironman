# Day 26：Session 用量與預算管理

這個範例對應〈[Day 26 - Session 用量與預算管理：AI Credits 與 Session Limits](../../day26/README.md)〉，透過兩個執行入口比較 GitHub Copilot 與 BYOK 的用量觀察和預算責任。

- `src/copilot.ts`：觀察單次模型呼叫、目前 Context 與 Session 累計 AI Credits，並替目前計量區間設定 Session Limits。
- `src/byok.ts`：觀察 BYOK Session 的單次模型呼叫與目前 Context；實際用量、配額與計費仍由模型提供者負責。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 依系列專案根目錄 `package-lock.json` 安裝的 `@github/copilot-sdk`
- 執行 GitHub Copilot 入口時，需要已完成 GitHub Copilot 認證的執行環境
- 執行 BYOK 入口時，需要可用的 OpenAI 相容模型端點、API Key 與模型 ID

## 安裝與型別檢查

在系列文章專案根目錄執行：

```bash
npm install
npm run typecheck --workspace day26-session-budget
```

如果將範例複製成一般獨立專案，可以在範例目錄執行 `npm install`。

## 執行 GitHub Copilot 入口

從系列文章專案根目錄執行：

```bash
npm run copilot --workspace day26-session-budget
```

在一般獨立專案中執行：

```bash
npx tsx src/copilot.ts
```

程式會在同一段 Session 依序送出兩則 Prompt。每次模型呼叫可能輸出單次 Token 用量與 Context 使用量，訊息完成後則查詢 Session 累計 AI Credits。

輸出格式如下，模型、Token 與 AI Credits 數值會依實際執行結果不同：

```text
[context] <currentTokens>/<tokenLimit>
[usage] model=<model> input=<tokens> output=<tokens>

模型回應：
<模型回應>
[session] aiCredits=<credits>
```

事件的實際先後順序可能不同。如果目前計量區間達到 30 AI Credits，而且 Runtime 還需要呼叫模型，還可能看到：

```text
[budget] exhausted used=<credits> max=30
[budget] completed action=cancel
```

範例不會刻意增加 Prompt 或降低限制來耗盡額度，因此沒有出現 `[budget]` 輸出也是正常結果。

## 執行 BYOK 入口

範例不會自動載入 `.env`。可參考 `.env.example`，在系列文章專案根目錄執行：

```bash
MODEL_BASE_URL="https://api.openai.com/v1" \
MODEL_API_KEY="<api-key>" \
MODEL_ID="<model-id>" \
npm run byok --workspace day26-session-budget
```

在一般獨立專案中執行：

```bash
MODEL_BASE_URL="https://api.openai.com/v1" \
MODEL_API_KEY="<api-key>" \
MODEL_ID="<model-id>" \
npx tsx src/byok.ts
```

缺少任一環境變數時，程式會在建立 Client 前停止：

```text
Error: MODEL_BASE_URL, MODEL_API_KEY and MODEL_ID are required
```

`MODEL_ID` 必須對應目前端點實際提供的模型。

## 觀察重點

- `assistant.usage` 描述單次模型呼叫的 Token 用量，可能在一則使用者訊息中出現多次。
- `session.usage_info` 描述目前 Context Window 的使用程度，不是整段 Session 的累計成本。
- `session.rpc.usage.getMetrics()` 回傳 GitHub Copilot Session 的累計用量；`totalNanoAiu / 1e9` 是目前官方範例採用的 AI Credits 顯示方式。
- `sessionLimits.maxAiCredits` 是目前計量區間的軟性上限，單次模型呼叫仍可能讓累計值超過限制。
- 額度耗盡時，Runtime 提出決策要求，GitHub Copilot 入口以 `action: "cancel"` 拒絕增加預算。
- BYOK 入口只用 SDK 事件觀察 Runtime 回報的 Token 與 Context；模型提供者的帳務資料仍是實際成本依據。
- `createSession()` 會在需要時啟動 Runtime，不需要額外呼叫 `client.start()`。

## 範例邊界

`sessionLimits` 與 `session.rpc.usage.getMetrics()` 目前屬於 Experimental API。AI Credits 不是 BYOK 模型提供者帳單，也不會涵蓋 Tool 使用的外部 API、資料庫或其他付費服務；正式產品仍需要建立使用者或 Tenant 層級的預算、配額與資源政策。
