# Day 07 - Session 事件流：追蹤 Agent 執行過程

理解 Agent Loop 之後，我們已經知道一則使用者訊息可能經過多個 Turn，模型也可能在過程中提出工具請求，再根據工具結果持續推進工作。不過，理解這套執行機制，還不代表應用程式能知道 Agent Runtime 此刻正在進行哪一個 Turn、哪一筆工具呼叫已經開始，以及目前的處理是否已經停止。

GitHub Copilot SDK 會將 Agent 執行期間產生的狀態以 Session 事件交給應用程式。透過這些事件，可以觀察訊息生成、Turn 邊界、工具執行與 Session 狀態，並利用事件中的識別資訊建立彼此的關聯。

## 透過 Session 事件觀察 Agent 執行

Agent Runtime 會持續推進 Turn、產生訊息並協調工具執行；如果應用程式只等待最後結果，就無法直接掌握這些中間狀態。

前面的範例經常使用 `sendAndWait()`：

```typescript
const response = await session.sendAndWait({
  prompt: "請分析目前的系統設計。",
});
```

`sendAndWait()` 讓應用程式等待目前這次處理停止，再取得這段期間最後收到的 Assistant 訊息。對只需要最終結果的流程，這種方式即可滿足需求。

當應用程式需要呈現執行進度、工具狀態或錯誤資訊時，就需要進一步取得 Agent 執行期間產生的狀態。例如聊天介面可能要逐步顯示模型輸出，工具開始執行時更新目前狀態，發生錯誤後則調整畫面或後續處理。

Session 事件提供了這層執行觀察能力。Agent Runtime 會在工作過程中持續送出不同類型的事件，應用程式可以依需求訂閱對應事件。和 Agent Loop 執行過程直接相關的事件，可以整理成以下幾組：

* **Turn 與訊息**：`assistant.turn_start`、`assistant.message` 與 `assistant.turn_end`，用來觀察 Turn 邊界與完整的 Assistant 訊息。
* **Streaming 輸出**：`assistant.message_delta`，用來取得模型生成期間持續產生的增量文字。
* **工具執行**：`tool.execution_start` 與 `tool.execution_complete`，用來觀察工具何時開始與完成。
* **Session 狀態**：`session.idle` 與 `session.error`，用來判斷目前處理是否停止或發生錯誤。

Session 還會產生其他類型的執行事件，實際應用時可以依照需要觀察的狀態選擇對應事件。

## Session 事件的基本結構

Session 事件雖然有不同類型，但都使用共同的事件外框。事件本身包含識別資訊與類型，該事件專屬的內容則放在 `data` 中。

以下用一筆 `tool.execution_start` 示意：

```json
{
  "id": "<event-id>",
  "timestamp": "2026-01-01T08:00:01.000Z",
  "parentId": "<previous-event-id>",
  "type": "tool.execution_start",
  "data": {
    "toolCallId": "<tool-call-id>",
    "toolName": "view",
    "arguments": {
      "path": "fixtures/project-info.txt"
    }
  }
}
```

這裡的 ID 與參數只用來表示資料結構，實際值會由 Agent Runtime 在執行期間產生。共同欄位主要包括：

* **`id`**：識別單一 Session 事件。
* **`timestamp`**：記錄事件產生時間。
* **`parentId`**：指向事件鏈中的前一筆事件；第一筆事件為 `null`。
* **`agentId`**：識別 Sub-agent 的事件來源；主 Agent 與 Session 層級事件通常不會出現。
* **`ephemeral`**：標示事件是否只存在於執行期間。
* **`type`**：區分事件種類，並決定 `data` 的型別。
* **`data`**：保存該事件類型專屬的資料。

`parentId` 描述整條事件流的前後關係，每一筆事件會指向前一筆事件，形成可以往回追蹤的事件鏈。後面會看到的 `messageId`、`turnId` 與 `toolCallId`，則分別負責訊息、Turn 與工具呼叫的關聯。

事件依保存方式可以分成 **暫時性事件（ephemeral event）** 與 **持久化事件（persisted event）**：

* **暫時性事件**：只在執行期間送出，不會寫入 Session 事件紀錄，恢復 Session 時也不會重新播放。例如 `assistant.message_delta`、`tool.execution_progress` 與 `session.idle`，適合反映模型生成、工具進度與目前執行狀態。
* **持久化事件**：會保存到 Session 事件紀錄，並在恢復時重新播放。例如完整的 `assistant.message` 與 `tool.execution_complete`，可用來保留已形成的訊息與工具執行結果。

其中，`assistant.message_delta` 需要在建立 Session 時啟用 Streaming，才會在模型生成期間持續送出；完整的 `assistant.message` 則表示這次模型呼叫最後形成的 Assistant 訊息。

因此，即時畫面狀態與完整紀錄可以由不同事件承擔。不同事件還會提供 `messageId`、`turnId` 與 `toolCallId` 等識別資訊，用來建立訊息、Turn 與工具執行之間的關聯。

## 實作：追蹤 Agent 執行事件

我們沿用前一篇建立的專案與測試資料，保留原本的 Prompt、工具與權限設定，另外啟用 `streaming: true` 並擴大事件訂閱範圍，將觀察重點轉向 Session 事件，以及訊息、Turn 與工具執行之間的關聯。

更新 `src/index.ts`：

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotClient, approveAll } from "@github/copilot-sdk";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  streaming: true,
  workingDirectory: projectDirectory,
  availableTools: ["view"],
  onPermissionRequest: approveAll,
});

const deltaCountByMessage = new Map<string, number>();

const unsubscribe = session.on((event) => {
  switch (event.type) {
    case "assistant.turn_start":
      console.log(`[turn:${event.data.turnId}] start`);
      break;

    case "assistant.message_delta": {
      const count = deltaCountByMessage.get(event.data.messageId) ?? 0;
      deltaCountByMessage.set(event.data.messageId, count + 1);
      break;
    }

    case "assistant.message": {
      const { messageId, toolRequests = [] } = event.data;
      const deltaCount = deltaCountByMessage.get(messageId) ?? 0;

      console.log(
        `[message:${messageId}] complete ` +
          `deltas=${deltaCount} toolRequests=${toolRequests.length}`,
      );

      for (const request of toolRequests) {
        console.log(
          `[tool:${request.toolCallId}] requested name=${request.name}`,
        );
      }
      break;
    }

    case "tool.execution_start":
      console.log(
        `[tool:${event.data.toolCallId}] start name=${event.data.toolName}`,
      );
      break;

    case "tool.execution_complete":
      console.log(
        `[tool:${event.data.toolCallId}] complete success=${event.data.success}`,
      );
      break;

    case "assistant.turn_end":
      console.log(`[turn:${event.data.turnId}] end`);
      break;

    case "session.error":
      console.error(
        `[session:error] ${event.data.errorType}: ${event.data.message}`,
      );
      break;

    case "session.idle":
      console.log("[session] idle");
      break;
  }
});

const response = await session.sendAndWait(
  {
    prompt:
      "請務必使用 view 工具讀取 fixtures/project-info.txt，" +
      "再根據檔案實際內容整理 Project、Runtime、Database、" +
      "Cache 與 Deployment；不要根據既有知識推測檔案內容。",
  },
  120_000,
);

console.log("\n模型回應：");
console.log(response?.data.content);

unsubscribe();
await session.disconnect();
await client.stop();
```

這份範例在原本的 Agent Loop 上加入 Streaming，並集中訂閱 Session 事件，讓應用程式除了觀察 Turn 與工具執行，也能進一步取得完整訊息、增量事件與 Session 狀態。接下來再從事件訂閱方式與識別碼關聯，拆解這些資訊如何對應到同一段執行流程。

### 訂閱 Session 事件

前一篇為了觀察 Agent Loop，分別訂閱了 Turn 與工具事件。這次需要同時處理多種 Session 事件，因此改用 `session.on(handler)` 接收完整的 Session 事件流，再透過 `event.type` 判斷目前收到的事件：

```typescript
const unsubscribe = session.on((event) => {
  switch (event.type) {
    // ...
  }
});
```

以 Node.js SDK 為例，`SessionEvent` 使用 TypeScript 的判別聯集型別。進入特定 `event.type` 分支後，`event.data` 會自動縮小成對應的資料結構，不需要另外自行轉型。

如果只需要處理特定事件，也可以直接指定事件類型：

```typescript
session.on("tool.execution_start", (event) => {
  console.log(event.data.toolName);
});
```

兩種方式可以依實際需求選擇。需要集中觀察整段執行時，可以訂閱完整事件流；如果不同模組各自負責特定狀態，則可以分別訂閱需要的事件。

`session.on(...)` 會回傳取消訂閱函式，範例在 `sendAndWait()` 完成後呼叫 `unsubscribe()`，停止接收這組事件。

### 用識別碼追蹤訊息、Turn 與工具執行

Session 事件描述不同層級的執行狀態，也會提供對應的識別碼建立彼此的關聯。這個範例主要使用 `messageId`、`turnId` 與 `toolCallId`：

* **`messageId`**：串接 `assistant.message_delta` 與最後形成的 `assistant.message`。兩種事件使用相同的 `messageId`，可以確認增量內容最後屬於哪一則完整訊息。
* **`turnId`**：配對同一次 Turn 的 `assistant.turn_start` 與 `assistant.turn_end`。
* **`toolCallId`**：串接 Assistant 提出的工具請求與後續工具執行事件。

同一筆工具呼叫的 `tool.execution_start` 與 `tool.execution_complete` 會沿用相同的 `toolCallId`。即使同一段工作包含多筆工具請求，也可以根據各自的 `toolCallId` 分別追蹤，不需要依賴事件出現或完成的固定順序。

### 執行應用程式

完成更新後執行：

```bash
$ npx tsx src/index.ts
```

如果 Agent 使用 `view` 讀取測試檔案，再根據內容形成回答，終端機可能看到類似以下結果：

```text
[turn:<turn-1>] start
[message:<message-id-1>] complete deltas=0 toolRequests=1
[tool:<tool-call-id>] requested name=view
[tool:<tool-call-id>] start name=view
[tool:<tool-call-id>] complete success=true
[turn:<turn-1>] end
[turn:<turn-2>] start
[message:<message-id-2>] complete deltas=18 toolRequests=0
[turn:<turn-2>] end
[session] idle

模型回應：
Project: Atlas-27
Runtime: Node.js 22
Database: PostgreSQL 17
Cache: Redis 8
Deployment: Kubernetes
```

上面的輸出只是其中一種可能結果。實際的 Turn 數量、工具呼叫次數與增量片段數量，仍會依模型判斷與 Runtime 執行情況而有所不同。

## Session 事件的處理與保存

前面的範例集中處理多種 Session 事件，是為了完整觀察 Agent 的執行流程。進入實際應用後，並不代表所有事件都需要以相同方式處理或保存，應用程式仍需要根據實際用途決定哪些資訊真正需要留下。

正式應用程式可以依照實際需求處理與保存事件資訊：

* **保留必要欄位**：即時介面可以處理增量訊息，工具執行則依需求記錄識別碼、工具名稱與結果狀態，不需要將完整事件資料全部保存。
* **控制敏感資訊**：工具事件可能包含執行參數與結果，Assistant 事件也可能帶有實際生成內容，因此保存前還需要考慮敏感資訊遮罩、存取權限與保存期限。
* **建立應用程式層關聯**：`id`、`messageId`、`turnId` 與 `toolCallId` 描述的是 Agent Runtime 的執行關係。使用者、請求或其他由應用程式管理的資源，仍然要由應用程式自行建立識別與關聯，不能直接把 Runtime 的事件識別碼當成這些資源的識別或授權依據。

Session 事件提供的是 Agent Runtime 的執行訊號，應用程式則負責決定哪些資訊需要保留，以及如何轉換成應用程式中的狀態與紀錄。這樣可以維持 Runtime 事件與應用程式資料模型之間清楚的責任邊界。

## 小結

Session 事件讓應用程式可以持續觀察 Agent Runtime 的執行過程，並利用事件類型與識別資訊整理出彼此的關聯：

* Session 事件具有共同的事件外框，`type` 與 `data` 描述實際發生的狀態，`parentId` 則串起事件之間的前後關係。
* 暫時性事件適合反映執行期間的即時狀態，持久化事件則會保存到 Session 事件紀錄，兩者適合承擔不同的使用情境。
* `messageId`、`turnId` 與 `toolCallId` 分別建立 Assistant 訊息、Turn 與工具呼叫的關聯，讓應用程式可以配對同一段執行中的相關事件。
* 應用程式可以依照實際用途選擇需要處理與保存的事件資訊，應用程式層的身分、請求與資源關聯則由應用程式自行管理。

掌握事件結構與識別碼之間的關係後，應用程式就能更準確地追蹤 Agent 執行過程，並維護對應的執行狀態。
