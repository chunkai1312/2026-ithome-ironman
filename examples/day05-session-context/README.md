# Day 05：Session 工作脈絡

這個範例對應〈[Day 05 - Session 設計：管理持續互動與工作脈絡](../../day05/README.md)〉，透過兩則具有前後關係的訊息，驗證同一個 Session 如何延續已經建立的對話脈絡。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 具備 GitHub Copilot 使用資格的 GitHub 帳號
- 已完成 Copilot CLI 登入

## 安裝

在系列文章專案根目錄安裝所有相依套件：

```bash
npm install
```

如果尚未登入 Copilot CLI，請在系列文章專案根目錄執行：

```bash
npx copilot login
```

## 型別檢查

在系列文章專案根目錄執行：

```bash
npm run typecheck --workspace day05-session-context
```

## 執行

在系列文章專案根目錄執行：

```bash
npm run start --workspace day05-session-context
```

程式會建立一個 Session，先詢問台灣最高的山，再以「那日本呢？」追問同一個主題。輸出會接近以下結構：

```text
Session: <session-id>

第一次回應：
台灣最高的山是玉山。

第二次回應：
日本最高的山是富士山。
```

實際回答不保證每次完全相同。驗證重點是兩次 `sendAndWait()` 使用相同的 Session，而且第二則訊息沒有重述完整問題，Agent 仍能根據前一輪內容理解問題。

範例使用 `model: "auto"`，讓 Copilot 從帳號目前可用的模型中選擇，避免固定模型受到帳號方案或組織政策限制。`createSession()` 會在需要時自動啟動 Client，因此程式不需要另外呼叫 `client.start()`。

## 範例限制

這是本機、單一使用者的最小範例，使用目前登入使用者的 Copilot 憑證。兩個 Prompt 都只需要模型根據一般知識回答，因此範例沒有提供權限處理函式；如果 Agent 改為要求執行工具，權限請求不會自動獲准。

範例沒有實作等待逾時、錯誤恢復、`try...finally` 清理、多人身分隔離、Session 持久化與跨程式重啟恢復，不應直接用於正式環境。
