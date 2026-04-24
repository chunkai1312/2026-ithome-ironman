import { CopilotClient, defineTool, type ToolResultObject } from "@github/copilot-sdk";
import { z } from "zod";

const SERVICE_HEALTH_TOOL = "get_service_health";

const serviceHealthSchema = z.object({
  service: z.string(),
  status: z.enum(["healthy", "degraded"]),
  errorRate: z.number(),
  activeIncidents: z.number(),
  observedAt: z.string(),
  collectorNode: z.string(),
  traceId: z.string(),
  metricSource: z.string(),
});

const checkoutHealth = {
  service: "checkout-api",
  status: "degraded",
  errorRate: 0.07,
  activeIncidents: 2,
  observedAt: "2026-08-23T01:30:00Z",
  collectorNode: "monitoring-node-07",
  traceId: "trace-8f4a21",
  metricSource: "service-health-v3",
} as const;

const getServiceHealth = defineTool(SERVICE_HEALTH_TOOL, {
  description: "Return fixed sample health data for a supported service",
  parameters: z.object({
    service: z.enum(["checkout-api", "inventory-api"]),
  }),
  defer: "never",
  skipPermission: true,
  handler: async ({ service }): Promise<ToolResultObject> => {
    if (service === "inventory-api") {
      return {
        resultType: "failure",
        textResultForLlm: "目前無法取得 inventory-api 的即時健康狀態。",
        error: "監控後端服務目前無法使用",
      };
    }

    return {
      resultType: "success",
      textResultForLlm: JSON.stringify(checkoutHealth),
    };
  },
});

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  tools: [getServiceHealth],
  availableTools: [`custom:${SERVICE_HEALTH_TOOL}`],
  hooks: {
    onPostToolUse: async (input) => {
      if (input.toolName !== SERVICE_HEALTH_TOOL) {
        return;
      }

      const parsed = serviceHealthSchema.safeParse(
        JSON.parse(input.toolResult.textResultForLlm),
      );

      if (!parsed.success) {
        return;
      }

      const { service, status, errorRate, activeIncidents, observedAt } = parsed.data;

      console.log(`[post-tool] success service=${service}`);

      return {
        modifiedResult: {
          resultType: "success",
          textResultForLlm: JSON.stringify({
            service,
            status,
            errorRate,
            activeIncidents,
            observedAt,
          }),
        },
        additionalContext:
          "這份健康狀態是目前時間點的監控資料。" +
          "請根據實際觀測結果說明目前狀態，" +
          "不要據此推論未提供的長期可用性。",
      };
    },
    onPostToolUseFailure: async (input) => {
      if (input.toolName !== SERVICE_HEALTH_TOOL) {
        return;
      }

      console.log(`[post-tool] failure error=${input.error}`);

      return {
        additionalContext:
          "目前無法取得服務的即時健康狀態。" +
          "不要把缺少監控資料解讀為服務正常，" +
          "也不要自行補足沒有取得的服務狀態。",
      };
    },
  },
});

const successResponse = await session.sendAndWait(
  {
    prompt:
      "請務必使用 get_service_health 查詢 checkout-api，" +
      "再根據工具實際提供的資料整理目前服務狀態；" +
      "不要補充工具沒有提供的資訊。",
  },
  120_000,
);

console.log("\ncheckout-api:");
console.log(successResponse?.data.content);

const failureResponse = await session.sendAndWait(
  {
    prompt:
      "請務必使用 get_service_health 查詢 inventory-api，" +
      "再說明目前能否判斷服務健康狀態；" +
      "不要根據既有知識推測。",
  },
  120_000,
);

console.log("\ninventory-api:");
console.log(failureResponse?.data.content);

await session.disconnect();
await client.stop();
