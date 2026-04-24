# Day 13：封裝可重用的 Agent 工作方法

這個範例對應〈[Day 13 - Skills 實戰：封裝可重用的 Agent 工作方法](../../day13/README.md)〉，示範如何將版本發布準備度審查方法整理成 `SKILL.md`，再透過 `skillDirectories` 提供給 GitHub Copilot SDK Session 使用。

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

## 專案結構

```text
skills/
└── release-readiness-review/
    └── SKILL.md
src/
└── index.ts
```

`skillDirectories` 指向 `skills/` 父目錄，Runtime 會從直接子目錄發現 `release-readiness-review/SKILL.md`。

## 型別檢查

```bash
npm run typecheck --workspace day13-skills
```

## 執行

```bash
npm run start --workspace day13-skills
```

程式會將固定的版本資料放進 Prompt，並明確要求 Agent 使用 `release-readiness-review` Skill。Skill 實際啟用時會先輸出事件，再顯示審查結果：

```text
[skill] invoked name=release-readiness-review

Review result:
判斷：Ready
...
```

自然語言內容與段落安排可能依模型而不同。驗證重點是 `skill.invoked` 確認 Skill 實際進入執行流程，而且結果使用 Skill 定義的判斷、依據、風險與理由結構。

## 固定輸入與預期判斷

範例提供的版本資料包含：

- 自動化測試 `128 passed, 0 failed`。
- 必要的 Migration 已準備完成。
- Rollback Plan 可用。
- Refresh token rotation 尚未啟用，但已明確標示 staging 可以接受，production 前必須完成。

依照 Skill 的規則，必要資訊完整、沒有阻擋條件，而且已知風險已有對 staging 的處置，因此預期判斷為 `Ready`。

## 能力範圍

- Skill 與固定發布資料都由範例專案提供，不讀取 Repository 或外部服務。
- `availableTools: ["builtin:skill"]` 只保留載入 Skill 所需的內建工具，不開放 Shell、檔案或其他外部工具。
- `skill.invoked` 只輸出 Skill 名稱，不將完整 Skill 內容寫入 Log。
- Skill 只提供工作方法，不會執行部署或賦予產品資源權限。

## 範例限制

Skill 是否適合目前任務仍由 Agent 判斷，因此 Prompt 明確指定 Skill 名稱以降低第一次驗證的不確定性。`skill.invoked` 只能證明 Skill 已啟用，不能作為安全控制或部署核准依據；確定性的發布政策仍應由應用程式、CI/CD Gate、Authorization 或其他程式流程執行。

這個範例只使用本機固定 Skill，沒有處理外部 Skill 的來源驗證、版本鎖定、更新策略、名稱衝突，以及 `scripts/`、`references/` 或 `assets/` 等額外資源。載入外部 Skill 前，仍應審查完整內容及其工具與腳本依賴。
