# Day 20：Session 生命週期

這個範例對應〈[Day 20 - Session 生命週期：初始化、Agent 停止與結束處理](../../day20/README.md)〉，示範如何使用 `onSessionStart`、`onAgentStop` 與 `onSessionEnd` 管理整段工作階段的初始化、完成條件及狀態清理。

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
npm run typecheck --workspace day20-session-lifecycle
```

## 執行

```bash
npm run start --workspace day20-session-lifecycle
```

範例會依序經過以下生命週期：

1. `onSessionStart` 建立以 Session ID 為 Key 的應用程式狀態，並以 `additionalContext` 加入固定版本資料。
2. Agent 第一次自然停止時，`onAgentStop` 執行最終發布檢查，回傳 `decision: "block"` 與 `reason` 要求 Agent 將結果納入回答。
3. Runtime 讓 Agent 納入驗證結果並完成工作；依目前執行路徑，後續可能再次進入 `onAgentStop`，也可能直接進入 Session End 流程。
4. 第一次 `onSessionEnd` 使用開始與結束 Hook 的 `timestamp` 計算執行時間，記錄結束原因後清除狀態。若 Runtime 後續再次觸發回呼，因狀態已不存在，執行時間會輸出 `unknown`。

終端機可能看到：

```text
[session:<session-id>] start source=new
[session:<session-id>] agent stop reason=<stop-reason> active=false
[session:<session-id>] final validation approved=true
[session:<session-id>] end reason=<end-reason> durationMs=<duration>
[session:<session-id>] end reason=<end-reason> durationMs=unknown

模型回應：
<包含最終驗證結果的發布判斷>
```

第二行 Session End 不一定出現。自然語言回答、Stop Hook 次數、Stop Reason、Session End Reason 與輸出順序可能因模型及 Runtime 而不同。驗證重點是第一次停止確實被阻擋、最終回答納入應用程式驗證結果，而且第一次 Session End 使用兩個 Hook 的時間戳記算出生命週期間隔。

## 觀察重點

- `createSession()` 會在 Client 尚未連線時自動啟動 Runtime，不需要額外呼叫 `client.start()`。
- `onSessionStart` 適合建立 Session 範圍狀態與共用 Context。
- `onAgentStop` 只處理 Top-level Agent 的自然停止，不處理 Abort、錯誤或 Sub-agent 停止。
- `decision: "block"` 會將 `reason` 排入後續處理，不應作為無限制重試機制。
- `onSessionEnd` 使用 `input.timestamp`，讓開始與結束時間都來自生命週期 Hook，不會混入 Handler 實際開始執行的時間。
- 同一個 Session 若再次進入 `onSessionEnd`，已清除的狀態不會再提供執行時間；對不存在的 Map Key 再次呼叫 `delete()`，以及再次 resolve 已完成的 Promise，都不會改變既有結果。
- `sessionEndCompleted` 讓主流程等待第一次 `onSessionEnd` 清理完成，不使用固定延遲猜測清理時機。

## 範例邊界

`lifecycleStates` 只保存在目前 Node.js 程序的記憶體中，不適合需要跨程序恢復或多執行個體共同處理的正式服務。重要資源的清理也不能只依賴 `onSessionEnd`，因為程序異常終止時不保證 Hook 一定有機會完成。
