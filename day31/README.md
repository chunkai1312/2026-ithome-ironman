# Day 31 - 後記：GitHub Copilot SDK 實戰回顧

30 天的連載走完後，回頭看最早的範例只有 `CopilotClient`、Session 與一次訊息互動。隨著 Agent 開始處理更完整的工作，後續逐步加入 Streaming、Agent Loop、工具整合與執行控制，再延伸到認證、模型存取、Runtime 架構、Session 持久化、長任務、多租戶與可觀測性。原本只需要在本機完成一次 Agent 互動的程式，也逐漸發展成包含 Application Session、Application Run、Worker、Runtime Pool 與執行追蹤的 Agent 服務架構。

這個系列持續處理的是 Copilot Agent Runtime 接進實際應用程式後產生的工程問題。哪些工作可以交給 Runtime，哪些狀態需要由應用程式管理，工具與模型又應該放在哪一層，都會影響 Agent 最後如何進入既有系統。這篇後記就回頭整理這 30 天走過的實作路徑，以及過程中累積下來的幾個工程觀念。

## 系列文章回顧

整個系列分成五個階段，沿著「建立應用 → 理解執行 → 擴充能力 → 控制流程 → 服務化與部署」逐步展開。後面的內容持續建立在前面的執行模型上，因此即使最後已經進入多租戶與 OpenTelemetry，整體架構仍然可以回到最初的 Client、Runtime 與 Session 理解。

### 核心觀念與快速上手（Day 01 - 03）

第一個階段先釐清 GitHub Copilot SDK 在 Agent 應用程式中的角色。

從模型呼叫與 Agent 任務的差異開始，先整理應用程式、SDK Client、Copilot CLI 與 Agent Runtime 的關係，理解 Copilot SDK 提供的是接入既有 Agent Runtime 的程式介面。接著使用 Node.js 與 TypeScript 建立第一個可以執行的 Agent 應用，實際跑通 Client、Runtime、Session 與訊息互動的基本路徑。

* [Day 01 - 前言：為什麼要用 GitHub Copilot SDK 開發 Agent 應用？](../day01/README.md)
* [Day 02 - 認識 GitHub Copilot SDK：應用程式如何接入 Agent Runtime](../day02/README.md)
* [Day 03 - 快速上手：建立第一個 GitHub Copilot Agent 應用](../day03/README.md)

前三篇建立了後續持續沿用的心智模型。應用程式透過 Copilot SDK 操作 Runtime，Session 承載一段工作，而持續推進 Agent Loop 的執行環境則位於 Agent Runtime。

### Session 與 Agent 執行機制（Day 04 - 08）

第一個 Agent 應用可以執行後，下一步開始拆解一則訊息送進 Runtime 之後工作如何持續推進。

Streaming 讓應用程式能在完整回應形成前持續取得增量內容；Session 建立可以延續工作脈絡的範圍；Turn 與 Agent Loop 則進一步說明一則使用者訊息可能經過多次模型呼叫與工具執行。

隨著執行流程變長，應用程式也需要掌握最後結果之外的執行狀態。Session 事件可以觀察訊息、Turn、工具與 Session 狀態的變化，工具權限控制則讓需要確認的操作在實際執行前取得應用程式或使用者的決策。

* [Day 04 - Streaming 實作：逐步輸出 Copilot 回應](../day04/README.md)
* [Day 05 - Session：延續互動與工作脈絡](../day05/README.md)
* [Day 06 - 理解 Agent Loop：Turn、工具呼叫與完成訊號](../day06/README.md)
* [Day 07 - Session 事件流：追蹤 Agent 執行過程](../day07/README.md)
* [Day 08 - 工具權限控制：決定 Agent 能否執行操作](../day08/README.md)

這個階段建立的 Session、Turn 與 Agent Loop，也成為後續能力整合、流程控制、Session 恢復與長任務設計的共同基礎。後面的功能雖然持續增加，執行時仍然沿用同一套 Agent Loop 推進工作。

### Agent 能力擴充與整合（Day 09 - 15）

理解 Runtime 如何執行工作後，第三個階段開始處理 Agent 可以取得哪些能力，以及這些能力應該放在哪一層。

自訂工具將應用程式既有的資料與業務能力提供給 Agent；MCP 則讓獨立行程或遠端服務透過標準介面提供工具。圖片輸入讓視覺資料可以直接進入 Session，使用者輸入請求與結構化輸入則讓執行中的工作可以補齊缺少的條件。

接著，Skill 將可重複使用的工作方法從單次 Prompt 中拆出來，自訂 Agent 與 Sub-agent 建立角色分工與能力邊界，Plugin Directory 則進一步把相關的 Agent、Skill 與其他擴充整理成可以一起載入與交付的能力單位。

* [Day 09 - 自訂工具實戰：讓 Agent 呼叫應用程式能力](../day09/README.md)
* [Day 10 - MCP 實戰：讓 Agent 使用外部工具服務](../day10/README.md)
* [Day 11 - 圖片輸入實戰：將視覺內容帶入 Session](../day11/README.md)
* [Day 12 - Agent 與使用者互動：補問與結構化輸入](../day12/README.md)
* [Day 13 - Skills 實戰：封裝可重用的 Agent 工作方法](../day13/README.md)
* [Day 14 - 自訂 Agent 與 Sub-agent：建立角色分工與能力邊界](../day14/README.md)
* [Day 15 - Plugin Directories：封裝與交付 Agent 擴充能力](../day15/README.md)

經過這個階段，Agent 可以使用的能力也有了更清楚的分層。自訂工具承接應用程式實際的資料取得與操作能力，MCP 提供獨立工具服務的整合方式，Skill 保存可重用的工作方法，自訂 Agent 建立角色與能力範圍，Plugin 則提供擴充能力的封裝與交付邊界。

### Agent 執行控制與生命週期（Day 16 - 20）

當 Agent 能夠使用的工具、工作方法與角色逐漸增加，執行流程也會變得更複雜。接下來需要處理的是應用程式如何在 Agent 已經開始工作後持續保有控制點。

Steering、Queueing 與 Abort 分別處理執行中的方向修正、後續訊息與中止。接著把 Hooks 放回 Agent 執行流程，依照不同時間點處理使用者提示、Runtime 轉換後的內容、工具執行前政策，以及工具成功或失敗後的結果。

最後再將控制範圍拉回整段 Session，利用生命週期 Hook 處理 Session 初始化、Agent 自然停止前的完成條件，以及 Session 結束時的狀態與資源收尾。

* [Day 16 - 執行中互動：轉向、排隊與中止](../day16/README.md)
* [Day 17 - Agent 輸入控管：系統訊息與 Prompt 前處理](../day17/README.md)
* [Day 18 - 工具執行前控管：參數驗證與政策判斷](../day18/README.md)
* [Day 19 - 工具執行後處理：結果轉換與失敗引導](../day19/README.md)
* [Day 20 - Session 生命週期：初始化、停止判斷與結束處理](../day20/README.md)

這個階段也讓 Agent 執行和應用程式責任之間的界線更加清楚。模型可以根據 Context 判斷下一步，Agent Runtime 可以協調模型與工具持續推進工作；確定性的參數驗證、業務政策、應用程式授權與外部系統狀態仍然由應用程式負責。

### Agent 服務化與正式部署（Day 21 - 30）

最後十篇開始把前面可以運作的 Agent 應用放進後端服務，處理超出單一開發行程後才會出現的問題。

GitHub 認證先釐清 Copilot 請求代表哪個 GitHub 身分，BYOK 將模型存取路徑拆開，讓 Runtime 可以使用應用程式指定的模型提供者。接著再處理 Copilot Runtime 的執行架構，理解 Bundled CLI、Local CLI 與 External Runtime 的部署邊界。

當 Session 需要跨越應用程式與 Runtime 的行程生命週期延續，還需要替 Runtime Session 狀態安排持久化儲存，並在恢復 Session 時重新提供 Tool、Hook、MCP、Skill、工作目錄與模型認證等執行期依賴。工作持續時間增加後，也需要掌握 Token、AI Credits 與 Session Limits 等模型用量與預算邊界。

最後四篇再把應用程式層的服務模型建立起來。Application Session 將應用程式管理的工作與 Runtime Session 分開；Application Run 將一次 Agent 執行從 HTTP Request 中拆出來，加入狀態、SSE 與取消；多租戶架構再補上 Tenant、Run Queue、Worker 與 Runtime 路由；最後透過 OpenTelemetry 將 Application Run、Agent Runtime、模型與 Tool 的執行串成可以追蹤與診斷的 Trace。

* [Day 21 - GitHub 認證：使用者身分與 Server-to-Server 存取](../day21/README.md)
* [Day 22 - BYOK 實戰：接入自有模型提供者](../day22/README.md)
* [Day 23 - Copilot Runtime 執行架構：連線方式與部署邊界](../day23/README.md)
* [Day 24 - Session 持久化：狀態保存與儲存架構](../day24/README.md)
* [Day 25 - 恢復 Session：延續工作脈絡與重建執行環境](../day25/README.md)
* [Day 26 - Session 用量與預算管理：AI Credits 與 Session Limits](../day26/README.md)
* [Day 27 - Agent 服務設計：Session 模型與服務邊界](../day27/README.md)
* [Day 28 - 長任務執行設計：Application Run、事件串流與取消](../day28/README.md)
* [Day 29 - 多租戶 Agent 服務：Session 隔離與 Runtime 路由](../day29/README.md)
* [Day 30 - Agent 服務可觀測性：OpenTelemetry 與執行追蹤](../day30/README.md)

走完這個階段後，最初只有 Client、Runtime 與 Session 的範例已經形成包含 Application Session、Application Run、Run Queue、Worker、Runtime Pool、租戶邊界與端到端 Trace 的服務架構。Copilot SDK 持續提供應用程式操作 Agent Runtime 所需要的介面，工作模型、授權、排程與服務狀態則由應用程式自行管理。

## 從 Agent 應用到服務架構

回到系列最初提出的問題，這 30 天處理的內容可以看成 Agent 能力進入系統後逐步增加的工程需求。

最初只需要讓應用程式建立 Session、送出訊息並取得結果。隨著 Agent 開始使用工具、延續工作、接受流程控制，最後進入後端服務，應用程式也需要逐步建立自己的執行狀態、安全邊界與服務模型。

整個系列累積下來的內容，可以整理成幾項主要能力：

* **Agent Runtime 整合**：理解應用程式、Copilot SDK、Copilot CLI 與 Agent Runtime 的分工，並利用 Session、Agent Loop、Streaming 與事件建立可以持續執行與觀察的 Agent 工作。
* **Agent 能力擴充**：利用自訂工具、MCP、圖片輸入、Skills、自訂 Agent 與 Plugin，將應用程式能力、外部工具服務、工作方法與角色分工帶進 Agent Runtime。
* **執行控制與治理**：透過工具權限、Steering、Queueing、Abort 與 Hooks 在不同階段介入 Agent 執行，同時將確定性的政策與授權留在應用程式。
* **Session 與執行狀態設計**：處理 Session 持久化與恢復、模型用量、Application Session 與 Application Run，讓應用程式中的工作不必直接等同某一個 SDK 物件或單一 HTTP Request。
* **Agent 服務架構**：加入多租戶邊界、Application Run Queue、Worker、Runtime 路由與 OpenTelemetry，讓 Agent 工作可以在多個服務元件之間持續執行，並保留足以定位問題的工程資訊。

這些能力逐步加入後，責任邊界仍要維持清楚。Session ID、Permission、Schema 驗證與 Runtime Session 都只處理 Agent 執行中的特定問題，不能取代應用程式的授權與租戶隔離。Agent Runtime 負責推進 Agent 執行，身分、資料與服務狀態則仍由應用程式管理。

## 延伸探索方向

走到 Agent 服務與執行追蹤後，仍然有不少方向可以繼續深入。這些問題已經逐漸超出單一 Copilot SDK API 的範圍，更接近完整的 Agent 平台與產品工程。

* **Agent 服務基礎設施**：目前最後幾篇以最小實作建立 Application Session、Application Run、Run Queue、Worker 與 Runtime Pool。正式服務還可以進一步導入持久化資料庫、分散式 Queue、Session Lock、自動擴縮、故障復原與 Kubernetes 等部署能力。
* **Agent 評估與測試**：自然語言輸出與 Agent 執行路徑具有不確定性，可以進一步建立固定評估任務、Tool Call 驗證、行為回歸測試，以及模型、Prompt、Skill 或 Runtime 升級後的比較流程。
* **安全與治理**：當 Agent 可以存取更多資料與工具後，還可以進一步處理 Credential 管理、資料分類、DLP、工具政策、稽核紀錄，以及企業環境中的集中式治理。
* **使用者體驗**：Streaming、Run events、使用者補問、結構化輸入與 Permission 都可以再整合進實際 Web 或 Mobile 產品，讓使用者能理解長時間工作目前正在做什麼，也能在必要時介入。
* **可觀測性與營運**：OpenTelemetry 建立端到端 Trace 之後，還可以進一步補上 Application Metrics、Dashboard、SLO、告警與容量規劃，讓單筆執行診斷逐漸形成完整的營運觀測能力。
* **SDK 與 Runtime 演進**：Copilot SDK 與 Agent Runtime 還會持續增加新的能力。面對新的 Session、Tool、Agent 或 Runtime 功能時，可以回到既有的責任模型，先判斷它處理哪一層問題，再決定應該如何接入自己的應用程式。

這些方向不一定都需要由 Copilot SDK 本身解決。當系統逐漸成為正式產品後，更多問題會進入應用程式架構、平台工程、安全治理與營運維護的範圍。

## 結語

回頭看這 30 天，最早只是希望讓一個 Node.js 程式可以建立 Session、送出 Prompt 並取得 Agent 回應。當 Agent 開始參與更完整的工作流程後，問題也逐步延伸到 Session 怎麼切分、工具如何取得資料、操作如何控制、執行怎麼保存與恢復，以及服務如何同時管理多個使用者與 Runtime。

GitHub Copilot SDK 與 Agent Runtime 還會持續演進，文章中的 API、事件、型別與執行能力也可能隨版本調整。比起記住某個版本有哪些 API，我更希望這個系列留下的是一套理解方式，能夠看清楚 Session 與 Agent Loop 如何運作、不同能力應該放在哪一層，以及哪些工作可以交給 Runtime、哪些責任仍然需要由應用程式處理。

系列一開始想回答的是如何把 GitHub Copilot 變成應用程式能力的一部分。走完這 30 天後，這個問題已經延伸成一條從第一個 Copilot Agent 應用走向 Agent 服務的實作路徑，也希望能幫助我們在之後遇到新的 Agent 能力時，更快判斷它解決的是哪一層問題、適合接在哪裡，以及自己的應用程式還需要保留哪些責任。

最後，本系列使用的範例程式碼都整理在 GitHub 的 [examples](https://github.com/chunkai1312/2026-ithome-ironman/tree/main/examples) 目錄。範例依 Day 03 ～ Day 30 分開保存，每個目錄都附有安裝、執行與型別檢查說明；你可以依照系列順序逐步實作，也可以直接挑選 Session、工具整合、執行控制或 Agent 服務等主題繼續探索。若這個系列對你有幫助，或你在實作時有不同的設計與經驗，也歡迎分享與交流。
