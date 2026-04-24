import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";

type WeatherRecord = {
  condition: string;
  temperatureC: number;
};

const weatherRecords: Record<string, WeatherRecord> = {
  Taipei: { condition: "Cloudy", temperatureC: 30 },
  Tokyo: { condition: "Sunny", temperatureC: 27 },
};

const getWeather = defineTool("get_weather", {
  description: "Return sample weather data for a supported city",
  parameters: z.object({
    city: z.string().describe("City name, such as Taipei or Tokyo"),
  }),
  defer: "never",
  skipPermission: true,
  handler: async ({ city }) => {
    const record = weatherRecords[city];

    if (!record) {
      return { city, found: false };
    }

    return { city, found: true, ...record };
  },
});

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  tools: [getWeather],
  availableTools: ["custom:*"],
});

session.on("tool.execution_start", (event) => {
  console.log(`[tool:${event.data.toolCallId}] start name=${event.data.toolName}`);
});

session.on("tool.execution_complete", (event) => {
  console.log(
    `[tool:${event.data.toolCallId}] complete success=${event.data.success}`,
  );
});

const response = await session.sendAndWait(
  {
    prompt:
      "請務必使用 get_weather 工具查詢 Taipei，" +
      "再根據工具實際回傳的示範資料回答天氣狀況；" +
      "不要根據既有知識推測。",
  },
  120_000,
);

console.log("\n模型回應：");
console.log(response?.data.content ?? "沒有收到 Assistant 訊息。");

await session.disconnect();
await client.stop();
