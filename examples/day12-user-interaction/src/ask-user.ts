import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { CopilotClient } from "@github/copilot-sdk";

const readline = createInterface({ input, output });
const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  availableTools: ["builtin:ask_user"],
  onUserInputRequest: async (request) => {
    console.log(`\n${request.question}`);

    request.choices?.forEach((choice, index) => {
      console.log(`${index + 1}. ${choice}`);
    });

    while (true) {
      const answer = (await readline.question("> ")).trim();
      const selectedChoice = request.choices?.find(
        (choice, index) => answer === choice || answer === String(index + 1),
      );

      if (selectedChoice) {
        return {
          answer: selectedChoice,
          wasFreeform: false,
        };
      }

      if (request.allowFreeform !== false && answer) {
        return {
          answer,
          wasFreeform: true,
        };
      }

      console.log("請選擇提供的選項。");
    }
  },
});

const response = await session.sendAndWait(
  {
    prompt:
      "請提供這次服務的部署方案建議。" +
      "目前尚未提供目標環境，請務必使用 ask_user，" +
      "詢問要部署到 production、staging 還是 dev。" +
      "取得回答後再整理部署建議。",
  },
  120_000,
);

console.log("\n部署建議：");
console.log(response?.data.content);

await session.disconnect();
await client.stop();
readline.close();
