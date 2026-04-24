# Day 11：將視覺內容帶入 Session

這個範例對應〈[Day 11 - 圖片輸入實戰：將視覺內容帶入 Session](../../day11/README.md)〉，示範如何選擇支援圖片輸入的模型，並將固定儀表板 PNG 以 File 附件和 Prompt 一起送進 GitHub Copilot SDK Session。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 具備 GitHub Copilot 使用資格的 GitHub 帳號
- 已完成 Copilot CLI 登入
- 帳號至少有一個目前可用且支援圖片輸入的模型

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

在系列文章專案根目錄執行：

```bash
npm run typecheck --workspace day11-image-input
```

## 執行

```bash
npm run start --workspace day11-image-input
```

程式會先透過 `listModels()` 選出支援圖片輸入且未被停用的模型，再將 `fixtures/dashboard.png` 的絕對路徑作為 File 附件送進 Session。

固定圖片包含以下可驗證資訊：

```text
Service Health

Availability: 99.95%
Error Rate: 2.4%
Pending Jobs: 18

Warning:
Database latency above threshold

Action:
View incidents
```

Assistant 應根據圖片整理三項服務指標、資料庫延遲告警與 `View incidents` 操作。實際句子、排序與格式會依模型而不同，驗證重點是回答使用圖片中的固定資訊，而且沒有將畫面以外的內容當成事實補入。

## 輸入與能力範圍

- `client.start()` 會在呼叫 `listModels()` 前先建立 Runtime 連線。
- `capabilities.supports.vision` 用來篩選支援圖片輸入的模型，`policy.state` 則排除明確停用的模型。
- `availableTools: []` 不向 Agent 開放任何工具，分析材料只來自 Prompt、圖片與既有 Session Context。
- File 附件使用程式組成的固定絕對路徑，不接受任意外部路徑。
- `sendAndWait()` 的等待時間上限為 2 分鐘。

## 範例限制

這個範例使用受控的固定圖片，因此沒有實作上傳驗證、檔案簽章檢查、惡意檔案掃描、路徑 Traversal 防護、EXIF 清理、圖片大小限制或租戶隔離。若改成使用外部圖片，應先驗證解析後路徑、實際格式、檔案大小與內容安全，再建立附件。

程式只示範正常流程中的 Session 與 Client 清理，沒有使用 `try...finally`。若模型查詢、Session 建立或等待回答時發生例外，正式服務仍需確保資源回收，並處理重試、Session 取消、使用量限制與模型版本變更。
