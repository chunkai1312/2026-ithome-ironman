# Day 16：執行中互動

這個範例對應〈[Day 16 - 執行中互動：轉向、排隊與中止](../../day16/README.md)〉，建立一個能在 Agent 執行期間接收轉向、排隊與中止指令的互動式 CLI。

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
npm run typecheck --workspace day16-execution-control
```

## 執行

```bash
npm run start --workspace day16-execution-control
```

程式啟動後會先等待操作。輸入 `/start` 送出分析工作後，執行期間可以輸入：

```text
/start          開始分析
/steer <訊息>   修正目前工作方向
/queue <訊息>   安排後續工作
/abort          中止目前工作
/exit           結束範例程式
```

第一次觀察時，建議每次輸入 `/start` 建立一段新的工作，再只測試其中一種控制方式。

### 轉向

在工具仍在執行時輸入：

```text
/steer 先聚焦 authentication，其他模組只需要簡短帶過
```

程式會以 `mode: "immediate"` 送入新訊息。已經開始的工具呼叫仍可能先完成，新的條件會嘗試影響後續模型處理。

### 排隊

在目前分析尚未結束時輸入：

```text
/queue 完成後，再整理目前的測試缺口
```

程式會以 `mode: "enqueue"` 排入新訊息，Runtime 會在目前工作完成後繼續處理。

### 中止

在工具或模型仍在執行時輸入：

```text
/abort
```

程式會呼叫 `session.abort()`。主要觀察 `abort` 事件，以及後續是否出現 `session.idle` 的 `aborted=true`。

## 預期輸出

事件順序與工具呼叫次數會依模型及輸入時機不同。啟動後會先看到操作說明；輸入 `/start` 後，至少會看到：

```text
[message:<message-id>] submitted
[tool:<tool-call-id>] start inspect_module
```

送入控制指令後，終端機會顯示對應的 Message ID 或 Abort 狀態。完成觀察後輸入 `/exit` 釋放 Session 與 Client。

## 能力與責任邊界

- Session 只開放 `inspect_module`，固定資料工具不讀取檔案、不呼叫外部 API，也沒有副作用。
- `send()` 只等待訊息提交並回傳 Message ID，不等待 Agent 工作完成。
- `immediate` 會嘗試影響目前執行的後續處理，不會撤銷已經開始的工具呼叫。
- `enqueue` 是 Session 內的訊息排隊，不是持久化工作佇列。
- `abort()` 中止目前處理，但不會自動補償或回滾已完成的外部副作用。

## 範例限制

固定資料會立即回傳，實際可操作的時間受到模型判斷、工具呼叫方式與執行環境影響。若目前工作很快完成，可再次輸入 `/start` 建立新的工作後重試。
