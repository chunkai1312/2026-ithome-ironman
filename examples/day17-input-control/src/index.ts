import { CopilotClient } from "@github/copilot-sdk";

const REVIEW_PREFIX = "/review ";

const reviewContext = {
  service: "authentication-api",
  environment: "staging",
  workflow: "engineering-design-review",
};

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  availableTools: [],
  systemMessage: {
    content: [
      "你是內部工程審查 Agent。",
      "只根據目前對話與提供的 Context 判斷。",
      "將觀察、風險與改善建議分開整理。",
      "資訊不足時不要自行補足系統細節。",
    ].join("\n"),
  },
  hooks: {
    onUserPromptSubmitted: async (input) => {
      if (!input.prompt.startsWith(REVIEW_PREFIX)) {
        return;
      }

      const target = input.prompt.slice(REVIEW_PREFIX.length).trim();

      console.log("[onUserPromptSubmitted] 原始 Prompt：");
      console.log(input.prompt);

      return {
        modifiedPrompt: [
          "請審查以下工程問題。",
          "請整理有資訊支持的觀察、風險與改善建議。",
          "",
          target,
        ].join("\n"),
        additionalContext: [
          `服務：${reviewContext.service}`,
          `環境：${reviewContext.environment}`,
          `工作流程：${reviewContext.workflow}`,
        ].join("\n"),
      };
    },
    onUserPromptTransformed: async (input) => {
      console.log("\n[onUserPromptTransformed] Prompt：");
      console.log(input.prompt);
      console.log("\n[onUserPromptTransformed] 轉換後內容：");
      console.log(input.transformedPrompt);
    },
  },
});

const response = await session.sendAndWait(
  {
    prompt:
      "/review 請檢查 refresh token rotation 尚未實作可能帶來的風險。" +
      "目前 access token 會過期，refresh token 可用來換發新的 access token。",
  },
  120_000,
);

console.log("\n審查結果：");
console.log(response?.data.content);

await session.disconnect();
await client.stop();
