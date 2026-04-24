# Day 14：自訂 Agent 與 Sub-agent

這個範例對應〈[Day 14 - 自訂 Agent 與 Sub-agent：建立角色分工與能力邊界](../../day14/README.md)〉，示範如何將版本資料取得與發布準備度審查拆成兩個自訂 Agent，再由主要 Agent 協調 Sub-agent 執行。

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

範例內含 Day 13 建立的 `release-readiness-review` Skill，因此可以獨立執行，不需要讀取其他 Day 的範例目錄。

## 型別檢查

```bash
npm run typecheck --workspace day14-custom-agents
```

## 執行

```bash
npm run start --workspace day14-custom-agents
```

Runtime 會先將版本資料取得工作委派給 `Release Researcher`，再將資料交給預載 Release Readiness Skill 的 `Release Reviewer`。終端機可能看到：

```text
[subagent:<tool-call-id>] started Release Researcher
[tool:<tool-call-id>] start get_release_status agent=<subagent-id>
[subagent:<tool-call-id>] completed Release Researcher
[subagent:<tool-call-id>] started Release Reviewer
[subagent:<tool-call-id>] completed Release Reviewer

Review result:
判斷：Ready
...
```

實際事件數量、`toolCallId`、`agentId` 與回答文字會依 Runtime 和模型判斷而不同。驗證重點是兩個角色都實際進入執行流程、`get_release_status` 由研究角色呼叫，而且審查結果依照 Skill 規則形成 `Ready` 判斷。

## 角色與能力範圍

- 主要 Agent 透過 `defaultAgent.excludedTools` 排除 `get_release_status` 與 `skill`，只負責協調與整理結果。
- Session 將 `workingDirectory` 設為 Day 14 範例目錄，避免上層專案脈絡干擾固定案例的判斷。
- `Release Researcher` 只能使用 `get_release_status`，負責取得固定版本資料，不形成發布判斷。
- `Release Reviewer` 使用 `tools: []`，不具備工具能力，只預載 `release-readiness-review` Skill。
- `get_release_status` 只回傳程式內固定資料，沒有外部副作用，因此設定 `skipPermission: true`。
- Sub-agent 事件與工具事件都沿用目前 Session 的事件流，工具事件透過 `agentId` 辨識來源。

## 範例限制

角色委派仍由 Runtime 與模型決定。Prompt 明確指定兩個角色是為了提高教學範例的可觀察性，不代表委派次數、順序或 Turn 結構具有固定保證。正式工作流程如果要求確定的執行順序，應由應用程式負責流程編排與輸入驗證。

範例沒有連接真實發布平台或 CI，也不執行部署。若將固定工具替換成正式資料來源，仍需加入使用者身分、Tenant Isolation、Authorization、逾時、重試、敏感資料處理與稽核紀錄；自訂 Agent 的工具範圍不能取代後端服務的資源授權。
