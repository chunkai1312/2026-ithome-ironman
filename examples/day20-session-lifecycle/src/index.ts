import { CopilotClient } from "@github/copilot-sdk";

type FinalValidation = {
  approved: boolean;
  summary: string;
};

type LifecycleState = {
  startedAt: Date;
  finalValidation?: FinalValidation;
};

const releaseStatus = {
  version: "2026.08.23",
  targetEnvironment: "staging",
  tests: {
    passed: 128,
    failed: 0,
  },
  migrationReady: true,
  rollbackAvailable: true,
  risk: {
    description: "Refresh Token 輪替尚未啟用。",
    acceptedForTarget: true,
    requirement: "production 前必須完成。",
  },
};

const lifecycleStates = new Map<string, LifecycleState>();

function buildReleaseContext(): string {
  return [
    `Release: ${releaseStatus.version}`,
    `Target environment: ${releaseStatus.targetEnvironment}`,
    `Automated tests: ${releaseStatus.tests.passed} passed, ${releaseStatus.tests.failed} failed`,
    `Migration ready: ${releaseStatus.migrationReady}`,
    `Rollback available: ${releaseStatus.rollbackAvailable}`,
    `Known risk: ${releaseStatus.risk.description}`,
    `Risk accepted for target: ${releaseStatus.risk.acceptedForTarget}`,
    `Risk requirement: ${releaseStatus.risk.requirement}`,
  ].join("\n");
}

function runFinalValidation(): FinalValidation {
  const approved =
    releaseStatus.tests.failed === 0 &&
    releaseStatus.migrationReady &&
    releaseStatus.rollbackAvailable &&
    releaseStatus.risk.acceptedForTarget;

  return {
    approved,
    summary: approved
      ? `staging 可以進行；${releaseStatus.risk.description} ${releaseStatus.risk.requirement}`
      : "目前仍有條件阻擋 staging 發布。",
  };
}

let resolveSessionEnd!: () => void;
const sessionEndCompleted = new Promise<void>((resolve) => {
  resolveSessionEnd = resolve;
});

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  availableTools: [],
  hooks: {
    onSessionStart: async (input, invocation) => {
      lifecycleStates.set(invocation.sessionId, {
        startedAt: input.timestamp,
      });

      console.log(
        `[session:${invocation.sessionId}] start source=${input.source}`,
      );

      return {
        additionalContext: [
          "目前正在進行版本發布準備度審查。",
          buildReleaseContext(),
          "請先根據目前資料形成判斷。",
          "如果應用程式在停止前提供最終驗證結果，請將它納入最後結論。",
        ].join("\n"),
      };
    },

    onAgentStop: async (input, invocation) => {
      const state = lifecycleStates.get(invocation.sessionId);
      if (!state) return;

      console.log(
        `[session:${invocation.sessionId}] ` +
          `agent stop reason=${input.stopReason ?? "unknown"} ` +
          `active=${input.stopHookActive === true}`,
      );

      if (input.stopHookActive || state.finalValidation) return;

      const finalValidation = runFinalValidation();
      state.finalValidation = finalValidation;

      console.log(
        `[session:${invocation.sessionId}] ` +
          `final validation approved=${finalValidation.approved}`,
      );

      return {
        decision: "block",
        reason: [
          "應用程式已完成最終發布檢查。",
          `結果：${finalValidation.approved ? "通過" : "阻擋"}`,
          `說明：${finalValidation.summary}`,
          "請將這項結果納入最後回答，再結束目前工作。",
        ].join("\n"),
      };
    },

    onSessionEnd: async (input, invocation) => {
      const state = lifecycleStates.get(invocation.sessionId);
      const durationMs = state
        ? input.timestamp.getTime() - state.startedAt.getTime()
        : undefined;

      console.log(
        `[session:${invocation.sessionId}] ` +
          `end reason=${input.reason} ` +
          `durationMs=${durationMs ?? "unknown"}`,
      );

      lifecycleStates.delete(invocation.sessionId);
      resolveSessionEnd();
    },
  },
});

const response = await session.sendAndWait(
  {
    prompt: "請判斷目前版本是否適合進入 staging，整理主要依據與仍需注意的風險。",
  },
  120_000,
);

console.log("\n模型回應：");
console.log(response?.data.content);

await session.disconnect();
await sessionEndCompleted;
await client.stop();
