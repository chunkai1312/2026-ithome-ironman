import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";

const LOG_TOOL_NAME = "query_service_logs";
const MAX_WINDOW_MINUTES = 60;
const MAX_LOG_LIMIT = 100;

const logQuerySchema = z.object({
  service: z.enum(["authentication-api", "checkout-api"]),
  environment: z.enum(["staging", "production"]),
  windowMinutes: z.number().int().min(5).max(1440),
  limit: z.number().int().min(1).max(1000),
});

type LogQuery = z.infer<typeof logQuerySchema>;

type LogPolicyResult =
  | { kind: "allow" }
  | { kind: "modify"; args: LogQuery }
  | { kind: "deny"; reason: string };

const logRecords = [
  {
    service: "checkout-api",
    environment: "staging",
    minutesAgo: 5,
    level: "error",
    message: "Payment gateway timeout",
  },
  {
    service: "checkout-api",
    environment: "staging",
    minutesAgo: 20,
    level: "warn",
    message: "Retry count exceeded threshold",
  },
  {
    service: "checkout-api",
    environment: "staging",
    minutesAgo: 50,
    level: "info",
    message: "Payment worker recovered",
  },
  {
    service: "checkout-api",
    environment: "staging",
    minutesAgo: 120,
    level: "error",
    message: "Payment gateway unavailable",
  },
  {
    service: "checkout-api",
    environment: "production",
    minutesAgo: 10,
    level: "error",
    message: "Production payment gateway timeout",
  },
  {
    service: "authentication-api",
    environment: "staging",
    minutesAgo: 15,
    level: "warn",
    message: "Refresh token reuse detected",
  },
] as const;

function evaluateLogPolicy(args: LogQuery): LogPolicyResult {
  if (args.environment === "production") {
    return {
      kind: "deny",
      reason: "目前 Agent 工作流程不允許查詢 production 日誌。",
    };
  }

  const effectiveArgs: LogQuery = {
    ...args,
    windowMinutes: Math.min(args.windowMinutes, MAX_WINDOW_MINUTES),
    limit: Math.min(args.limit, MAX_LOG_LIMIT),
  };

  if (
    effectiveArgs.windowMinutes !== args.windowMinutes ||
    effectiveArgs.limit !== args.limit
  ) {
    return { kind: "modify", args: effectiveArgs };
  }

  return { kind: "allow" };
}

const queryServiceLogs = defineTool(LOG_TOOL_NAME, {
  description: "Query fixed sample logs for a service and environment",
  parameters: logQuerySchema,
  defer: "never",
  skipPermission: true,
  handler: async ({ service, environment, windowMinutes, limit }) => {
    console.log(
      `[handler] service=${service} environment=${environment} windowMinutes=${windowMinutes} limit=${limit}`,
    );

    const records = logRecords
      .filter(
        (record) =>
          record.service === service &&
          record.environment === environment &&
          record.minutesAgo <= windowMinutes,
      )
      .slice(0, limit);

    return {
      service,
      environment,
      windowMinutes,
      limit,
      returned: records.length,
      records,
    };
  },
});

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  tools: [queryServiceLogs],
  availableTools: [`custom:${LOG_TOOL_NAME}`],
  hooks: {
    onPreToolUse: async (input) => {
      if (input.toolName !== LOG_TOOL_NAME) {
        return {
          permissionDecision: "deny",
          permissionDecisionReason: `工具 '${input.toolName}' 不在目前允許的執行政策中。`,
        };
      }

      const parsed = logQuerySchema.safeParse(input.toolArgs);

      if (!parsed.success) {
        console.log("[policy] denied: invalid arguments");

        return {
          permissionDecision: "deny",
          permissionDecisionReason:
            "query_service_logs 的參數格式不符合預期。",
        };
      }

      const policy = evaluateLogPolicy(parsed.data);

      if (policy.kind === "deny") {
        console.log(`[policy] denied: ${policy.reason}`);

        return {
          permissionDecision: "deny",
          permissionDecisionReason: policy.reason,
        };
      }

      if (policy.kind === "modify") {
        console.log(
          `[policy] modified windowMinutes=${policy.args.windowMinutes} limit=${policy.args.limit}`,
        );

        return {
          permissionDecision: "allow",
          modifiedArgs: policy.args,
        };
      }

      console.log("[policy] allowed");

      return { permissionDecision: "allow" };
    },
  },
});

const limitedResponse = await session.sendAndWait(
  {
    prompt:
      "請務必使用 query_service_logs 工具查詢 checkout-api 的 staging 日誌。" +
      "呼叫工具時請使用 environment=staging、windowMinutes=180、limit=500，" +
      "不要自行縮小參數；最後只根據工具實際回傳的日誌整理問題。",
  },
  120_000,
);

console.log("\nStaging query:");
console.log(limitedResponse?.data.content);

const deniedResponse = await session.sendAndWait(
  {
    prompt:
      "請務必使用 query_service_logs 工具查詢 checkout-api 的 production 日誌。" +
      "呼叫工具時請使用 environment=production、windowMinutes=30、limit=50。" +
      "如果工具被拒絕，直接說明目前無法執行查詢，不要改成其他環境或再次呼叫工具。",
  },
  120_000,
);

console.log("\nProduction query:");
console.log(deniedResponse?.data.content);

await session.disconnect();
await client.stop();
