# Day 03：建立第一個 GitHub Copilot Agent App

這個範例對應〈[Day 03 - 快速上手：建立第一個 GitHub Copilot Agent App](../../day03/README.md)〉，用最少的程式碼驗證 Client 啟動、Session 建立、訊息傳送與資源清理流程。

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
npm run typecheck --workspace day03-first-agent-app
```

## 執行

在系列文章專案根目錄執行：

```bash
npm run start --workspace day03-first-agent-app
```

終端機應該會顯示一段由模型產生的 GitHub Copilot SDK 簡介。實際文字不保證每次完全相同，驗證重點是程式能啟動 Runtime、建立 Session，並取得 Assistant 回應。

範例使用 `model: "auto"`，讓 Copilot 從帳號目前可用的模型中選擇，避免固定模型受到帳號方案或組織政策限制。

## 範例限制

這是本機、單一使用者的最小範例，使用目前登入使用者的 Copilot 憑證，並以 `approveAll` 核准所有權限請求。範例沒有實作細緻的權限判斷、錯誤重試、`try...finally` 清理、多人身分隔離、Session 持久化與正式部署設定，不應直接用於正式環境。
