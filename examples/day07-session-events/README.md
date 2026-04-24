# Day 07：追蹤 Session 事件流

這個範例對應〈[Day 07 - Session 事件流：追蹤 Agent 執行過程](../../day07/README.md)〉，透過 `messageId`、`turnId` 與 `toolCallId`，將一則訊息產生的完整訊息、Streaming 片段、Turn 與工具執行串成事件時間線。

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
npm run typecheck --workspace day07-session-events
```

## 執行

在系列文章專案根目錄執行：

```bash
npm run start --workspace day07-session-events
```

範例會將 Session 的工作目錄設定為這個範例的根目錄，只開放 `view`，並要求 Agent 讀取 `fixtures/project-info.txt`。因為 SDK Session 沒有互動式介面可以回覆 Permission request，程式會在這個受限工具集合中透過 `approveAll` 核准工具請求。

輸出會接近以下結構：

```text
[turn:<turn-1>] start
[message:<message-id-1>] complete deltas=0 toolRequests=1
[tool:<tool-call-id>] requested name=view
[tool:<tool-call-id>] start name=view
[tool:<tool-call-id>] complete success=true
[turn:<turn-1>] end
[turn:<turn-2>] start
[message:<message-id-2>] complete deltas=<count> toolRequests=0
[turn:<turn-2>] end
[session] idle

模型回應：
Project: Atlas-27
Runtime: Node.js 22
Database: PostgreSQL 17
Cache: Redis 8
Deployment: Kubernetes
```

實際 Turn 數量、工具呼叫次數、增量片段數量與回答格式不保證每次完全相同。驗證重點包括：

- `assistant.message_delta` 與完整訊息可以用相同的 `messageId` 關聯。
- `assistant.turn_start` 與 `assistant.turn_end` 使用相同的 `turnId`。
- 工具請求、開始與完成事件使用相同的 `toolCallId`。
- 整段 Agent Loop 最後進入 `session.idle`。

範例使用 `model: "auto"`，讓 Copilot 從帳號目前可用的模型中選擇，避免固定模型受到帳號方案或組織政策限制。

## 範例限制

這是本機、單一使用者的事件觀察範例，使用目前登入使用者的 Copilot 憑證。雖然 Session 只開放 `view` 並讀取固定 fixture，`approveAll` 仍會核准目前可用工具提出的所有 Permission request；如果未來擴大 `availableTools`，不能在沒有風險判斷的情況下沿用相同設定。

程式刻意只記錄識別碼、工具名稱、片段數量與成功狀態，不輸出完整工具參數或結果。範例沒有實作事件持久化、敏感資訊遮罩、產品層請求關聯、錯誤恢復、取消與多人身分隔離。為了維持事件關聯主線清楚，程式也只示範正常流程的資源釋放；如果 `sendAndWait()` 發生錯誤或超過 120 秒等待上限，正式環境仍應使用 `try...finally` 完成收尾。
