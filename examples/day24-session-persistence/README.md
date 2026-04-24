# Day 24：Session 持久化

這個範例對應〈[Day 24 - Session 持久化：狀態保存與儲存架構](../../day24/README.md)〉，分別示範 Runtime 使用自己的資料目錄保存 Session 狀態，以及應用程式透過 `SessionFsProvider` 接管 Session 檔案操作。兩個入口都使用 `mode: "empty"` 與 `availableTools: []`，避免繼承 Copilot CLI 的環境能力，讓執行結果集中在 Session 持久化。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 依系列專案根目錄 `package-lock.json` 安裝的 `@github/copilot-sdk`
- 已完成 GitHub Copilot 認證的執行環境

## 安裝與型別檢查

在系列文章專案根目錄執行：

```bash
npm install
npm run typecheck --workspace day24-session-persistence
```

如果將範例複製成一般獨立專案，可以在範例目錄執行 `npm install`。

## 專案結構

```text
app-data/
runtime-data/
src/
├── base-directory.ts
├── local-session-fs-provider.ts
└── session-fs.ts
```

`runtime-data/` 與 `app-data/` 只保存執行時產生的 Session 資料，內容已由各自的 `.gitignore` 排除。

## 使用 Runtime 資料目錄

從系列文章專案根目錄執行：

```bash
npm run base-directory --workspace day24-session-persistence
```

程式透過 `baseDirectory` 將 SDK 管理 Runtime 的資料位置指定為 `runtime-data/`。停止 Runtime 後，終端機會輸出實際的 Session workspace 路徑與其中項目：

```text
[session] created incident-review-runtime

Incident 摘要：
<模型回應>

Runtime 保存的 Session 狀態：
<專案路徑>/runtime-data/session-state/incident-review-runtime
<實際項目>
```

驗證重點是 `session.workspacePath` 位於 `runtime-data/`，而且 Runtime 停止後仍可讀取該目錄；實際項目會依 Runtime 與 Session 執行情況不同。

## 使用應用程式 Session filesystem

接著執行：

```bash
npm run session-fs --workspace day24-session-persistence
```

程式會先建立目前 Session 的 Provider 根目錄，再以 `/` 作為 `initialCwd`，並由 `createSessionFsProvider` 為目前 Session 建立本機 Provider。停止 Runtime 後，終端機會輸出應用程式管理的狀態目錄：

```text
[session] created incident-review-session-fs

Incident 摘要：
<模型回應>

應用程式保存的 Session 狀態：
<專案路徑>/app-data/incident-review-session-fs/session-state
<實際項目>
```

驗證重點是 Session 狀態出現在 `app-data/incident-review-session-fs/session-state/`，表示檔案操作已交由應用程式提供的 Provider 承接。

## 範例邊界

- 兩個入口只驗證狀態是否保存，不執行 `resumeSession()`；Session 恢復與執行能力重建由 Day 25 示範。
- 範例使用固定 Session ID。再次建立前應先處理先前留下的同名 Session，避免把建立流程誤當成恢復流程。
- 本機 `SessionFsProvider` 只用來展示介面與路徑映射，沒有實作 Tenant Isolation、符號連結防護、並行鎖定、遠端持久化、生命週期清理或 SQLite 能力。
- `disconnect()` 保留持久化狀態；工作確定結束後，應用程式才使用 `deleteSession()` 移除資料。
