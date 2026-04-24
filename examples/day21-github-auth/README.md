# Day 21：GitHub 認證

這個範例對應〈[Day 21 - GitHub 認證：使用者身分與 Server-to-Server 存取](../../day21/README.md)〉，示範如何將 User Access Token、GitHub Actions 工作流程 Token 與 GitHub App Installation Access Token 提供給 GitHub Copilot SDK。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 依系列專案根目錄 `package-lock.json` 安裝的 `@github/copilot-sdk`
- 符合對應認證路徑的 GitHub Copilot 資格、組織政策與 Token 權限

在系列文章專案根目錄安裝相依套件並執行型別檢查：

```bash
npm install
npm run typecheck --workspace day21-github-auth
```

如果將範例複製成一般獨立專案，可以在範例目錄執行 `npm install`。`.env.example` 只列出需要的環境變數，不會自動載入。

## User Access Token

`src/user-token.ts` 假設應用程式已經透過 GitHub OAuth App 或 GitHub App User Authorization 取得目前使用者的 User Access Token。程式將 Token 設定在 `CopilotClient`，並以 `useLoggedInUser: false` 停用已保存登入資訊的回退。

從系列文章專案根目錄執行：

```bash
USER_GITHUB_TOKEN="<user-access-token>" \
npm run user-token --workspace day21-github-auth
```

在一般獨立專案中執行：

```bash
USER_GITHUB_TOKEN="<user-access-token>" \
npx tsx src/user-token.ts
```

缺少 `USER_GITHUB_TOKEN` 時，程式會在建立 Client 前停止，不會回退到目前電腦保存的 Copilot CLI 或 GitHub CLI 使用者認證。

## GitHub Actions

`src/actions.ts` 不直接接收 Token。`.github/workflows/copilot-sdk.yml` 將工作流程的 `GITHUB_TOKEN` 放入 Runtime 可辨識的環境，並授予 `contents: read` 與 `copilot-requests: write`。

將範例複製成獨立 Repository 後，從 GitHub Actions 手動觸發 `Copilot SDK` 工作流程。該 Repository 所屬組織還必須允許 Copilot CLI 用量計入組織，否則即使工作流程語法正確也無法完成模型請求。

## GitHub App Installation

`src/github-app.ts` 從 `INSTALLATION_TOKEN` 取得短效 Installation Access Token，再透過 Client 的 `env` 將它以 `COPILOT_GITHUB_TOKEN` 提供給 SDK 啟動的 Runtime。

從系列文章專案根目錄執行：

```bash
INSTALLATION_TOKEN="<installation-access-token>" \
npm run github-app --workspace day21-github-auth
```

在一般獨立專案中執行：

```bash
INSTALLATION_TOKEN="<installation-access-token>" \
npx tsx src/github-app.ts
```

Installation Access Token 不能直接當成 SDK 或 Session 的 `gitHubToken`。GitHub App 必須具備 Copilot Requests Repository 權限，並符合目前服務端對 Installation 與 Repository 的要求。

## 預期結果

三支程式都會建立不開放 Tool 的 Session，送出固定 Prompt，再將模型回答輸出到終端機。自然語言內容會受到模型與執行環境影響，不需要期待固定文字。

User Access Token 與 GitHub App 範例缺少必要環境變數時，會在建立 Client 前停止，例如：

```text
Error: USER_GITHUB_TOKEN is required
```

## 觀察重點

- `gitHubToken` 用於 SDK 或 Session 的 GitHub User Token；多使用者共享 Runtime 時，應優先縮小到 Session 層。
- `useLoggedInUser: false` 停用已保存的 Copilot CLI 與 GitHub CLI 使用者登入回退，但明確提供的環境 Token 仍可參與認證。
- Runtime 依序檢查 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN` 與 `GITHUB_TOKEN`。
- Client 的 `env` 只影響由 SDK 啟動的 Runtime；外部 Runtime 必須在自己的執行環境取得 Server-to-Server Token。
- GitHub 認證不取代應用程式自己的 Session 所有權、資料存取與工具授權判斷。

## 範例邊界

範例不實作 OAuth Redirect、Callback、Authorization Code 交換、GitHub App JWT 與 Installation Access Token 建立流程，也不保存或更新 Token。GitHub Actions 與 GitHub App 路徑需要在符合組織政策與權限條件的 GitHub 環境驗證，不能只靠本機型別檢查證明外部認證成功。
