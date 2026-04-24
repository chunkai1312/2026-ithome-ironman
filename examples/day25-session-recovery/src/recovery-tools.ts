import { defineTool } from "@github/copilot-sdk";
import { z } from "zod";

const incidentStatus = {
  service: "checkout-api",
  status: "degraded",
  errorRate: 0.07,
  activeIncidents: 2,
  mitigation: "Traffic shifted to the secondary payment gateway.",
  observedAt: "2026-08-24T01:00:00Z",
};

export const getIncidentStatus = defineTool("get_incident_status", {
  description: "Return the current fixed incident status",
  parameters: z.object({}),
  defer: "never",
  skipPermission: true,
  handler: async () => {
    console.log("[tool] get_incident_status executed");
    return incidentStatus;
  },
});
