# Day 17：Agent 輸入控管

這個範例對應〈[Day 17 - Agent 輸入控管：系統訊息與 Prompt 前處理](../../day17/README.md)〉，示範如何將固定審查原則放進 System Message，再透過 Prompt Hooks 轉換目前輸入並補充應用程式 Context。

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
npm run typecheck --workspace day17-input-control
```

## 執行

```bash
npm run start --workspace day17-input-control
```

程式會送出一則以 `/review` 開頭的工程審查請求，依序觀察兩個 Prompt Hook：

1. `onUserPromptSubmitted` 輸出原始 Prompt，透過 `modifiedPrompt` 展開審查任務，並以 `additionalContext` 加入服務、環境與工作流程。
2. `onUserPromptTransformed` 輸出前一個 Hook 修改後的 Prompt，以及 Runtime 準備交給模型的 `transformedPrompt`。
3. Agent 根據 System Message、處理後的 User Prompt 與應用程式 Context 形成審查結果。

輸出結構如下，Runtime 轉換內容與自然語言回答可能因版本及模型而不同：

```text
[onUserPromptSubmitted] 原始 Prompt：
/review 請檢查 refresh token rotation 尚未實作可能帶來的風險。...

[onUserPromptTransformed] Prompt：
請審查以下工程問題。
請整理有資訊支持的觀察、風險與改善建議。
...

[onUserPromptTransformed] 轉換後內容：
<runtime transformed prompt>

審查結果：
<assistant response>
```

## 觀察重點

- System Message 使用預設 `append` 模式，保留 SDK 管理的 System Prompt。
- `availableTools: []` 讓 Session 不使用 Tool，避免從其他來源取得額外資料。
- `modifiedPrompt` 改變本次 User Prompt；`additionalContext` 補充應用程式掌握的動態背景。
- `transformedPrompt` 只代表 Runtime 轉換後的 User Prompt，不是模型取得的完整 Context。
- `onUserPromptTransformed` 在 `@github/copilot-sdk 1.0.9` 提供；若使用較早版本，需先升級 SDK。

## 範例邊界

Prompt Hook 適合轉換或補充已經送進 Runtime 的訊息。需要在訊息進入 Runtime 前強制拒絕的輸入，仍應在呼叫 `send()` 或 `sendAndWait()` 之前由應用程式檢查。
