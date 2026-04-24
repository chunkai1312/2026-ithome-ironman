# GitHub Copilot SDK 實戰：從 Agent 應用到可部署服務

隨著 LLM 應用從聊天介面延伸到實際產品，開發者需要處理的已不只有提示詞。如何讓 Agent 理解任務、使用工具，並持續推進工作，都是開發 Agent 應用時必須面對的問題。GitHub Copilot SDK 提供了一套整合方式，讓開發者能將 Copilot 能力帶進應用程式與工作流程。

本系列以 GitHub Copilot SDK 為主軸，從基本觀念與 Session 互動開始，逐步介紹工具整合、流程控制與應用架構，並延伸到後端服務化與部署。程式範例以 Node.js 和 TypeScript 實作，內容著重於互動模型與系統設計，讓不同技術背景的開發者也能掌握核心設計觀念。


## 目錄

### 第一篇：核心觀念與快速上手

- [Day 01 - 前言：為什麼要用 GitHub Copilot SDK 開發 Agent 應用？](./day01/README.md)
- [Day 02 - 認識 GitHub Copilot SDK：應用程式如何接入 Agent Runtime](./day02/README.md)
- [Day 03 - 快速上手：建立第一個 GitHub Copilot Agent App](./day03/README.md)

### 第二篇：Session 與 Agent 執行機制

- [Day 04 - Streaming 實作：逐步輸出 Copilot 回應](./day04/README.md)
- [Day 05 - Session：延續互動與工作脈絡](./day05/README.md)
- [Day 06 - 理解 Agent Loop：Turn、工具呼叫與完成訊號](./day06/README.md)
- [Day 07 - Session 事件流：追蹤 Agent 執行過程](./day07/README.md)
- [Day 08 - 工具權限控制：決定 Agent 能否執行操作](./day08/README.md)

### 第三篇：Agent 能力擴充與整合

- [Day 09 - 自訂工具實戰：讓 Agent 呼叫應用程式能力](./day09/README.md)
- [Day 10 - MCP 實戰：讓 Agent 使用外部工具服務](./day10/README.md)
- [Day 11 - 圖片輸入實戰：將視覺內容帶入 Session](./day11/README.md)
- [Day 12 - Agent 與使用者互動：補問與結構化輸入](./day12/README.md)
- [Day 13 - Skills 實戰：封裝可重用的 Agent 工作方法](./day13/README.md)
- [Day 14 - 自訂 Agent 與 Sub-agent：建立角色分工與能力邊界](./day14/README.md)
- [Day 15 - Plugin Directories：封裝與交付 Agent 擴充能力](./day15/README.md)

### 第四篇：Agent 執行控制與生命週期

- [Day 16 - 執行中互動：轉向、排隊與中止](./day16/README.md)
- [Day 17 - Agent 輸入控管：系統訊息與 Prompt 前處理](./day17/README.md)
- [Day 18 - 工具執行前控管：參數驗證與政策判斷](./day18/README.md)
- [Day 19 - 工具執行後處理：結果轉換與失敗引導](./day19/README.md)
- [Day 20 - Session 生命週期：初始化、停止判斷與結束處理](./day20/README.md)

### 第五篇：Agent 服務化與正式部署

- [Day 21 - GitHub 認證：使用者身分與 Server-to-Server 存取](./day21/README.md)
- [Day 22 - BYOK 實戰：接入自有模型提供者](./day22/README.md)
- [Day 23 - Copilot Runtime 執行架構：連線方式與部署邊界](./day23/README.md)
- [Day 24 - Session 持久化：狀態保存與儲存架構](./day24/README.md)
- [Day 25 - 恢復 Session：延續工作脈絡與重建執行環境](./day25/README.md)
- [Day 26 - Session 用量與預算管理：AI Credits 與 Session Limits](./day26/README.md)
- [Day 27 - Agent 服務設計：Session 模型與服務邊界](./day27/README.md)
- [Day 28 - 長任務執行設計：Application Run、事件串流與取消](./day28/README.md)
- [Day 29 - 多租戶 Agent 服務：Session 隔離與 Runtime 路由](./day29/README.md)
- [Day 30 - Agent 服務可觀測性：OpenTelemetry 與執行追蹤](./day30/README.md)

### 後記

- [Day 31 - 後記：GitHub Copilot SDK 實戰回顧](./day31/README.md)
