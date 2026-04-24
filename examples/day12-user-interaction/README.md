# Day 12：Agent 補問與結構化輸入

這個範例對應〈[Day 12 - Agent 與使用者互動：補問與結構化輸入](../../day12/README.md)〉，分別示範 Agent 透過 `ask_user` 補問部署環境，以及應用程式透過 `session.ui.elicitation()` 主動取得結構化部署設定。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 具備 GitHub Copilot 使用資格的 GitHub 帳號
- 已完成 Copilot CLI 登入
- 可互動的終端機

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
npm run typecheck --workspace day12-user-interaction
```

## 執行 Agent 補問範例

```bash
npm run start:ask-user --workspace day12-user-interaction
```

Agent 會透過 `ask_user` 詢問部署環境。輸入選項文字或編號後，回答會回到原本的 Agent Loop，再繼續產生部署建議：

```text
這次要部署到哪個環境？
1. production
2. staging
3. dev
> 2

部署建議：
<assistant-response>
```

實際問題文字、選項順序與補問次數可能依模型而不同，模型也可能根據任務再確認其他條件；程式會沿用相同的 Handler 承接後續請求。驗證重點是 Agent 確實進入使用者輸入請求，而且取得回答後仍沿用目前 Session 繼續處理。

## 執行結構化輸入範例

```bash
npm run start:elicitation --workspace day12-user-interaction
```

應用程式會主動要求部署環境、服務名稱、部署區域與是否先試跑：

```text
請提供部署方案需要的設定

部署環境：
1. production
2. staging
3. dev
> 2

服務名稱：orders-api

部署區域：
1. ap-northeast-1
2. us-east-1
3. eu-west-1
> 1

先進行試跑？(Y/n)：
>

部署建議：
<assistant-response>
```

空白的試跑回答會採用 `true`。完成後，應用程式會把確認過的結構化資料送進 Session，要求 Agent 只整理建議，不執行實際部署。

## 能力與輸入範圍

- `ask-user.ts` 透過 `availableTools: ["builtin:ask_user"]` 只開放補問工具。
- `elicitation.ts` 使用 `availableTools: []`，不向 Agent 開放任何工具。
- `onUserInputRequest` 支援選項文字、編號及 Agent 允許時的自由輸入。
- `onElicitationRequest` 只接受 `form` 模式，CLI 會驗證必填文字與固定選項。
- 兩個流程都只產生部署方案文字，不會執行部署。
- `sendAndWait()` 的等待時間上限為 2 分鐘。

## 範例限制

這是單一使用者的本機 CLI 範例，結構化輸入欄位由程式固定實作，沒有根據任意 `requestedSchema` 動態產生表單。正式產品仍需處理使用者身分、多個提供者競爭回覆、互動逾時、取消、敏感資訊遮罩、Schema 與業務規則驗證，以及輸入內容的保存期限與存取權限。

程式只示範正常流程中的 Session、Client 與 readline 清理，沒有使用 `try...finally`。如果互動或模型處理期間發生例外，正式服務仍需確保資源回收，並處理重試、Session 取消、稽核紀錄及外部監控。
