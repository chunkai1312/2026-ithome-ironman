# Day 08：確認工具執行權限

這個範例對應〈[Day 08 - 工具權限控制：決定 Agent 能否執行操作](../../day08/README.md)〉，要求 Agent 透過 Shell 執行 `pwd`，並在工具真正執行前，將完整指令交給使用者逐筆確認。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 具備 GitHub Copilot 使用資格的 GitHub 帳號
- 已完成 Copilot CLI 登入
- 可供使用者輸入的互動式終端機（TTY）

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
npm run typecheck --workspace day08-tool-permissions
```

## 執行

在系列文章專案根目錄的互動式終端機執行：

```bash
npm run start --workspace day08-tool-permissions
```

當 Agent 要執行 `pwd` 時，終端機會先顯示工具生命週期已開始，再顯示 Permission request 與操作內容：

```text
[tool:<tool-call-id>] start name=bash
[permission:<request-id>] requested kind=shell

Agent 要求執行 Shell 指令。
用途：取得目前工作目錄
指令：pwd
是否允許這一次操作？(y/N)：
```

輸入 `y` 或 `yes` 會回傳 `approve-once`，只批准目前這一次請求。批准流程會接著出現 Permission 完成結果與工具執行事件：

```text
[permission:<request-id>] completed result=approved
[tool:<tool-call-id>] complete success=true

模型回應：
目前工作目錄是 <working-directory>。
```

重新執行並直接按 Enter，或輸入 `n`，則會回傳 `reject`。這次 Shell 操作不會真正執行，模型會根據拒絕結果說明無法取得工作目錄。

`tool.execution_start` 表示這筆工具呼叫已進入執行生命週期，不代表受權限保護的 Shell 指令已經取得許可。實際指令仍會等待 Permission decision；只有批准後才會看到 `tool.execution_complete success=true`，拒絕時則會收到 `success=false`，而且不會真正執行 `pwd`。

實際的用途文字、工具名稱與模型回答不保證每次完全相同。驗證重點是同一筆 Permission request 與工具呼叫可以透過識別碼關聯，並且批准與拒絕會形成不同的完成結果。

範例使用 `model: "auto"`，讓 Copilot 從帳號目前可用的模型中選擇，避免固定模型受到帳號方案或組織政策限制。

## 範例限制

這是本機、單一使用者的互動範例，使用目前登入使用者的 Copilot 憑證。Handler 採取預設拒絕策略，只接受一般 Shell 請求，拒絕其他 Permission kind 與 Sandbox Bypass；它仍然沒有解析或限制實際 Shell 指令，因此不能作為正式環境的授權政策。

非互動式環境會回傳 `user-not-available`，不會改成自動批准。範例沒有實作重複請求限制、等待中的取消、稽核紀錄、敏感資訊遮罩、多人身分隔離與產品層 Authorization。為了維持 Permission 主線清楚，程式也只示範正常流程的資源釋放；若 `sendAndWait()` 發生錯誤或超過 120 秒等待上限，正式環境仍應使用 `try...finally` 完成收尾。
