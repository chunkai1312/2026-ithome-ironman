# Day 04：Streaming 即時回應

這個範例對應〈[Day 04 - Streaming 實作：打造即時回應的 Copilot 互動體驗](../../day04/README.md)〉，示範如何啟用 Streaming、接收 `assistant.message_delta` 事件，並以 `session.idle` 判斷一輪互動已經完成。

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
npm run typecheck --workspace day04-streaming
```

## 執行

在系列文章專案根目錄執行：

```bash
npm run start --workspace day04-streaming
```

終端機中的內容應該隨著模型產生回應逐步顯示，最後在 `session.idle` 事件發生後換行並結束程式。實際文字與增量片段的數量不保證每次完全相同，驗證重點是回應會透過一或多個 `assistant.message_delta` 事件送達，而不是只在最後一次輸出完整內容。

範例使用 `model: "auto"`，讓 Copilot 從帳號目前可用的模型中選擇，避免固定模型受到帳號方案或組織政策限制。

## 範例限制

這是本機、單一使用者的最小範例，使用目前登入使用者的 Copilot 憑證，並以 `approveAll` 核准所有權限請求。範例沒有實作事件錯誤處理、等待逾時、取消、細緻的權限判斷、`try...finally` 清理、多人身分隔離、Session 持久化與正式部署設定，不應直接用於正式環境。
