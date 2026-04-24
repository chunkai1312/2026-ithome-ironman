# Day 06：觀察 Agent Loop

這個範例對應〈[Day 06 - 理解 Agent Loop：Turn、工具呼叫與完成訊號](../../day06/README.md)〉，要求 Agent 先讀取固定的測試檔案，再利用 Turn 與工具事件觀察一則使用者訊息如何在 Agent Loop 中持續推進。

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
npm run typecheck --workspace day06-agent-loop
```

## 執行

在系列文章專案根目錄執行：

```bash
npm run start --workspace day06-agent-loop
```

範例會將 Session 的工作目錄設定為這個範例的根目錄，並只開放 Copilot CLI 內建的 `view` 工具。Agent 必須先讀取 `fixtures/project-info.txt`，才能根據檔案內容回答。因為 SDK Session 沒有互動式介面可以回覆 Permission request，範例會在只開放 `view` 的前提下，透過 `approveAll` 核准工具請求。輸出會接近以下結構：

```text
[turn:<turn-1>] start
[tool:<tool-call-id>] start name=view
[tool:<tool-call-id>] complete success=true
[turn:<turn-1>] end
[turn:<turn-2>] start
[turn:<turn-2>] end
[session] idle

Turn 數量：2
工具執行次數：1

模型回應：
Project: Atlas-27
Runtime: Node.js 22
Database: PostgreSQL 17
Cache: Redis 8
Deployment: Kubernetes
```

實際 Turn 數量、工具呼叫次數與回答格式不保證每次完全相同。驗證重點是程式只送出一則訊息，執行期間至少出現一次 `view` 工具呼叫，工具結果進入後續 Turn，最後再以 `session.idle` 結束目前的處理。

範例使用 `model: "auto"`，讓 Copilot 從帳號目前可用的模型中選擇，避免固定模型受到帳號方案或組織政策限制。

## 範例限制

這是本機、單一使用者的觀察範例，使用目前登入使用者的 Copilot 憑證。雖然 Session 只開放 `view` 並讀取固定 fixture，`approveAll` 仍會核准目前可用工具提出的所有 Permission request；如果未來擴大 `availableTools`，不能在沒有風險判斷的情況下沿用相同設定。

範例沒有實作錯誤恢復、取消、事件持久化、多人身分隔離與產品層完成條件。為了維持 Agent Loop 主線清楚，程式也只示範正常流程的資源釋放；如果 `sendAndWait()` 發生錯誤或超過 120 秒等待上限，正式環境仍應使用 `try...finally` 並搭配取消與錯誤恢復機制完成收尾。
