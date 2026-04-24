import { context, propagation, trace } from "@opentelemetry/api";
import { defineTool } from "@github/copilot-sdk";
import { z } from "zod";

const tracer = trace.getTracer("copilot-agent-service");

const serviceStatus = {
  service: "checkout-api",
  status: "degraded",
  errorRate: 0.07,
  activeIncidents: 2,
  observedAt: "2026-08-25T08:00:00Z",
};

export const getServiceStatus = defineTool("get_service_status", {
  description: "Return fixed sample status for checkout-api",
  parameters: z.object({
    service: z.literal("checkout-api"),
  }),
  defer: "never",
  skipPermission: true,
  handler: async ({ service }, invocation) => {
    const carrier: Record<string, string> = {};

    if (invocation.traceparent) {
      carrier.traceparent = invocation.traceparent;
    }

    if (invocation.tracestate) {
      carrier.tracestate = invocation.tracestate;
    }

    const parentContext = propagation.extract(context.active(), carrier);

    return context.with(parentContext, () =>
      tracer.startActiveSpan(
        "tool.get_service_status",
        {
          attributes: {
            "app.tool.name": "get_service_status",
            "app.tool.call.id": invocation.toolCallId,
          },
        },
        async (span) => {
          try {
            return { ...serviceStatus, service };
          } finally {
            span.end();
          }
        },
      ),
    );
  },
});
