import { context, propagation, trace } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";

const traceExporter = new OTLPTraceExporter({
  url:
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
    "http://localhost:4318/v1/traces",
});

const sdk = new NodeSDK({
  serviceName: "copilot-agent-service",
  traceExporter,
});

sdk.start();

export const tracer = trace.getTracer("copilot-agent-service");

export function getCurrentTraceContext(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}
