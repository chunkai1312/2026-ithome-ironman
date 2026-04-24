# Day 15：Plugin Directories

這個範例對應〈[Day 15 - Plugin Directories：封裝與交付 Agent 擴充能力](../../day15/README.md)〉，示範如何將版本發布審查角色與 Skill 封裝成 Plugin，再由 Agent Runtime 載入並交給主要 Agent 使用。

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 具備 GitHub Copilot 使用資格的 GitHub 帳號
- 已安裝並完成登入的 Copilot CLI

## 安裝

在系列文章專案根目錄安裝所有相依套件：

```bash
npm install
```

如果尚未登入 Copilot CLI，執行：

```bash
copilot login
```

為了直接驗證 Plugin Directory 作為可攜式能力單位的載入方式，這個範例會明確指定外部 Copilot CLI。執行前先設定其絕對路徑；macOS 或 Linux 可以執行：

```bash
export COPILOT_CLI_PATH="$(command -v copilot)"
```

也可以參考 `.env.example`，依目前環境設定 `COPILOT_CLI_PATH`。這項設定讓範例清楚表達 Runtime 使用的 CLI 來源，也方便替換不同環境中的 CLI 來驗證同一個 Plugin Directory。

## 專案結構

```text
plugins/
└── release-readiness/
    ├── plugin.json
    ├── skills/
    │   └── release-readiness-review/
    │       └── SKILL.md
    └── com.github.copilot/
        └── agents/
            └── release-reviewer.agent.md
src/
└── index.ts
```

`release-readiness` Plugin 封裝 `Release Reviewer` 與它預載的 `release-readiness-review` Skill。固定版本資料、`get_release_status` 工具與 `Release Researcher` 則留在應用程式，讓可重用的審查能力與應用程式專屬的資料來源維持清楚邊界。

## 型別檢查

```bash
npm run typecheck --workspace day15-plugin-directories
```

## 執行

```bash
npm run start --workspace day15-plugin-directories
```

程式會透過 `--plugin-dir` 在 Runtime 啟動階段載入 Plugin，並先用 `plugins.list()` 與 `skills.list()` 確認 Plugin 和 Skill 可用。主要 Agent 接著委派 `Release Researcher` 取得固定版本資料，再交給 Plugin 提供的 `Release Reviewer` 審查。終端機可能看到：

```text
[plugin] release-readiness loaded
[subagent:<tool-call-id>] started Release Researcher
[tool:<tool-call-id>] start get_release_status agent=<subagent-id>
[subagent:<tool-call-id>] completed Release Researcher
[subagent:<tool-call-id>] started Release Reviewer
[subagent:<tool-call-id>] completed Release Reviewer

審查結果：
判斷：Ready
...
```

實際事件數量、`toolCallId`、`agentId` 與回答文字會依 Runtime 和模型判斷而不同。驗證重點是 `release-readiness` Plugin 與其中的 Skill 成功載入、兩個角色都進入執行流程，而且 `get_release_status` 由研究角色呼叫。

## 能力邊界

- `plugin.json` 透過 `$schema` 採用 Agent Plugins `1.0`；可攜式 Skill 放在 `skills/`，Copilot 專屬 Agent 放在 `com.github.copilot/agents/`。
- 主要 Agent 透過 `defaultAgent.excludedTools` 排除 `get_release_status` 與 `skill`，只負責協調與整理結果。
- `Release Researcher` 只能使用 `get_release_status`，負責取得固定版本資料，不形成發布判斷。
- `Release Reviewer` 使用 `tools: []`，不具備工具能力，只預載 Plugin 內的審查 Skill。
- `get_release_status` 只回傳程式內固定資料，沒有外部副作用，因此設定 `skipPermission: true`。

## 範例限制

角色委派仍由 Runtime 與模型決定。Prompt 明確指定兩個角色是為了提高教學範例的可觀察性，不代表委派次數、順序或 Turn 結構具有固定保證。正式工作流程如果要求確定的執行順序，應由應用程式負責流程編排與輸入驗證。

範例沒有連接真實發布平台或 CI，也不執行部署。若將固定工具替換成正式資料來源，仍需加入使用者身分、Tenant Isolation、Authorization、逾時、重試、敏感資料處理與稽核紀錄；Plugin 與自訂 Agent 的工具範圍不能取代後端服務的資源授權。
