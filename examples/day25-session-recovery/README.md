# Day 25：恢復 Session

這個範例對應〈[Day 25 - 恢復 Session：延續工作脈絡與重建執行環境](../../day25/README.md)〉，示範一段 Session 如何跨越兩個 Node.js 行程與 Runtime 生命週期繼續工作，以及新的行程如何重新提供自訂工具處理函式。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 依系列專案根目錄 `package-lock.json` 安裝的 `@github/copilot-sdk`
- 已完成 GitHub Copilot 認證的執行環境

## 安裝與型別檢查

在系列文章專案根目錄執行：

```bash
npm install
npm run typecheck --workspace day25-session-recovery
```

如果將範例複製成一般獨立專案，可以在範例目錄執行 `npm install`。

## 專案結構

```text
runtime-data/
src/
├── recovery-create.ts
├── recovery-resume.ts
└── recovery-tools.ts
```

`runtime-data/` 保存兩個 Node.js 行程共用的 Session 狀態，執行產物已由 `.gitignore` 排除。

## 執行

先建立 Session 並完成第一輪 Incident 分析：

```bash
npm run create --workspace day25-session-recovery
```

接著以新的 Node.js 行程與 Runtime 恢復相同 Session：

```bash
npm run resume --workspace day25-session-recovery
```

輸出格式如下；模型回應文字可能不同：

```text
[session] created incident-review-recovery
[tool] get_incident_status executed

Incident 分析：
<模型回應>
```

```text
[session] resumed incident-review-recovery
[tool] get_incident_status executed

更新後分析：
<模型回應>
```

第二次工具紀錄由新的 Node.js 行程輸出，表示 `resumeSession()` 恢復原本工作脈絡後，目前行程重新提供的工具處理函式仍能參與 Agent Loop。固定資料沒有改變，因此第二輪分析應判斷 Incident 狀態沒有變化。

## 範例邊界

- 兩個 Client 都使用 `mode: "empty"`，並只開放 `custom:get_incident_status`，避免繼承 Copilot CLI 的其他環境能力。
- 建立與恢復程式必須依序執行，而且兩者必須使用相同的 `runtime-data/` 與 Session ID。
- 範例使用固定 Session ID。若要重新執行建立流程，必須先清除 `runtime-data/` 中前一次測試產生的資料。
- 範例等待第一輪 Agent 工作完成才停止 Runtime，因此沒有設定 `continuePendingWork`；尚未完成的 Tool Call 或 Permission Request 需要另外設計恢復策略。
- 自訂工具資料固定保存在程式中，不連接外部 API，也不修改系統狀態。
