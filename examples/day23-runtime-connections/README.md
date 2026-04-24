# Day 23：Copilot Runtime 連線方式

這個範例對應〈[Day 23 - Copilot Runtime 執行架構：連線方式與部署邊界](../../day23/README.md)〉，使用同一段 Session 程式切換 Bundled CLI、Local CLI 與 External Runtime，觀察 Runtime 執行檔、程序生命週期與連線方式由哪一層管理。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 依系列專案根目錄 `package-lock.json` 安裝的 `@github/copilot-sdk`
- 已完成 GitHub Copilot 認證的執行環境
- 測試 Local 模式時，可供目前作業系統執行且和 SDK 相容的 Copilot CLI
- 測試 External 模式時，已經啟動的 Copilot Runtime Headless Server

範例不會自動載入 `.env`。可參考 `.env.example` 準備環境變數：

```text
RUNTIME_MODE=bundled
LOCAL_COPILOT_PATH=/usr/local/bin/copilot
COPILOT_RUNTIME_URL=localhost:4321
```

`RUNTIME_MODE` 未設定時預設為 `bundled`。只有 Local 模式需要 `LOCAL_COPILOT_PATH`，只有 External 模式需要事先啟動 Headless Server；`COPILOT_RUNTIME_URL` 未設定時預設為 `localhost:4321`。

## 安裝與型別檢查

在系列文章專案根目錄執行：

```bash
npm install
npm run typecheck --workspace day23-runtime-connections
```

如果將範例複製成一般獨立專案，可以在範例目錄執行 `npm install`。

## 執行 Bundled CLI 模式

Bundled 模式由 SDK 選擇相容的 Copilot Runtime 執行檔、啟動子程序，並透過 stdio 通訊：

```bash
npm run start --workspace day23-runtime-connections
```

輸出的第一行會確認目前模式：

```text
[runtime] mode=bundled
```

## 執行 Local CLI 模式

Local 模式仍由 SDK 啟動 Runtime 子程序，但執行檔改由 `LOCAL_COPILOT_PATH` 指定：

```bash
RUNTIME_MODE=local \
LOCAL_COPILOT_PATH="/usr/local/bin/copilot" \
npm run start --workspace day23-runtime-connections
```

輸出的第一行會變成：

```text
[runtime] mode=local
```

使用方需要自行確保指定的 Copilot CLI 可以執行，而且版本和目前 SDK 相容。

## 執行 External Runtime 模式

先在另一個 Terminal 啟動 Headless Server：

```bash
copilot --headless --port 4321
```

保持 Runtime 執行，再從系列文章專案根目錄執行：

```bash
RUNTIME_MODE=external \
COPILOT_RUNTIME_URL="localhost:4321" \
npm run start --workspace day23-runtime-connections
```

輸出的第一行會變成：

```text
[runtime] mode=external
```

應用程式結束時只會關閉自己的 Client 連線，不會停止由外部啟動的 Headless Server。

## 預期結果

三種模式都會送出同一個 Prompt，接著輸出模型整理的三項 Copilot Runtime 責任。實際回答會受到模型與目前執行結果影響，不需要期待固定文字；驗證重點是三種模式都能建立 Session 並取得模型回應。

設定不存在的模式時，程式會停止並指出輸入值：

```text
Error: 不支援的 RUNTIME_MODE: unknown
```

## 觀察重點

- Bundled 與 Local 都由 SDK 建立 Runtime 子程序，差異是 Runtime 執行檔由 SDK 還是使用方提供。
- External 模式使用 `RuntimeConnection.forUri()` 連接既有 Runtime，SDK 不擁有 Server 程序的生命週期。
- Bundled 與 Local 模式會使用目前執行環境的 GitHub Copilot 認證；External 模式的認證則由 Headless Server 所在環境管理。
- `createSession()` 會在需要時啟動 Runtime 或建立連線，不需要額外呼叫 `client.start()`。
- `availableTools: []` 讓範例只驗證 Runtime 與模型連線，不引入 Tool 執行差異。
