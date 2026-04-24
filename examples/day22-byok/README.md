# Day 22：BYOK 實戰

這個範例對應〈[Day 22 - BYOK 實戰：接入自有模型提供者](../../day22/README.md)〉，示範如何讓 GitHub Copilot Agent Runtime 透過 OpenAI 相容端點完成模型請求。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 依系列專案根目錄 `package-lock.json` 安裝的 `@github/copilot-sdk`
- 可用的 OpenAI 相容模型端點、API Key 與模型 ID

範例不會自動載入 `.env`。`.env.example` 只列出需要提供的環境變數：

```text
MODEL_BASE_URL=https://api.openai.com/v1
MODEL_API_KEY=<api-key>
MODEL_ID=<model-id>
```

`MODEL_ID` 必須對應目前端點實際部署或允許使用的模型。若端點不需要 API Key，例如未啟用認證的本機 Ollama，請依實際環境調整必要欄位檢查。

## 安裝與型別檢查

在系列文章專案根目錄執行：

```bash
npm install
npm run typecheck --workspace day22-byok
```

如果將範例複製成一般獨立專案，可以在範例目錄執行 `npm install`。

## 執行

從系列文章專案根目錄執行：

```bash
MODEL_BASE_URL="https://api.openai.com/v1" \
MODEL_API_KEY="<api-key>" \
MODEL_ID="<model-id>" \
npm run start --workspace day22-byok
```

在一般獨立專案中執行：

```bash
MODEL_BASE_URL="https://api.openai.com/v1" \
MODEL_API_KEY="<api-key>" \
MODEL_ID="<model-id>" \
npx tsx src/index.ts
```

## 預期結果

Session 不開放任何 Tool。Agent Runtime 會透過指定的 OpenAI 相容端點處理固定 Prompt，終端機則輸出模型整理的三項正式服務工程問題。實際文字會受到模型與端點影響，不需要期待固定回答。

缺少任一環境變數時，程式會在建立 Client 前停止：

```text
Error: MODEL_BASE_URL、MODEL_API_KEY 與 MODEL_ID 都必須提供。
```

## 觀察重點

- `model` 必須對應目前端點實際提供的模型 ID，不能使用 `"auto"`。
- `provider.type: "openai"` 適用於 OpenAI 與使用 OpenAI API 格式的相容端點。
- `baseUrl` 需要包含 OpenAI 相容 API 的完整基底路徑。
- 範例未設定 `wireApi`，因此使用預設的 `"completions"`；需要 Responses API 時可明確設定 `wireApi: "responses"`。
- `availableTools: []` 只用來排除其他 Agent 能力，和 BYOK 模型存取本身沒有直接關係。
- `createSession()` 會在 Client 尚未連線時自動啟動 Runtime，不需要額外呼叫 `client.start()`。

## 範例邊界

範例只呈現 API Key 認證的最小成功路徑，沒有實作 Secret Manager、動態 Bearer Token、Token 更新、重試、逾時治理、Rate Limit 控制或用量政策。正式服務仍需要依模型提供者的認證方式與營運要求補上這些機制。
