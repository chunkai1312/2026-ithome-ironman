import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotClient } from "@github/copilot-sdk";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const imagePath = path.join(projectDirectory, "fixtures", "dashboard.png");

const client = new CopilotClient();
await client.start();

const models = await client.listModels();
const visionModel = models.find(
  (model) =>
    model.capabilities.supports.vision &&
    model.policy?.state !== "disabled",
);

if (!visionModel) {
  throw new Error("目前沒有可用且支援圖片輸入的模型。");
}

const session = await client.createSession({
  model: visionModel.id,
  availableTools: [],
});

const response = await session.sendAndWait(
  {
    prompt:
      "請根據這張儀表板的實際畫面，整理目前的主要服務指標、告警內容，" +
      "以及畫面提供的主要操作；不要補充圖片中沒有的資訊。",
    attachments: [
      {
        type: "file",
        path: imagePath,
      },
    ],
  },
  120_000,
);

console.log(response?.data.content);

await session.disconnect();
await client.stop();
