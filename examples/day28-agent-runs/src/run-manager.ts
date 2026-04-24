import { getRuntimeSession } from "./runtime.js";
import {
  cancelRun,
  completeRun,
  failRun,
  getRun,
  isTerminalRunStatus,
  publishRunEvent,
  setRunOutput,
  setRuntimeMessageId,
} from "./run-store.js";
import type { ApplicationRun } from "./types.js";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown Runtime error";
}

export async function startRun(
  run: ApplicationRun,
  runtimeSessionId: string,
): Promise<void> {
  const runtimeSession = await getRuntimeSession(runtimeSessionId);

  const unsubscribe = runtimeSession.on((event) => {
    switch (event.type) {
      case "assistant.message_delta":
        if (!event.agentId && event.data.deltaContent) {
          publishRunEvent(run.id, {
            type: "run.output.delta",
            delta: event.data.deltaContent,
          });
        }
        break;

      case "assistant.message":
        if (!event.agentId && event.data.content) {
          setRunOutput(run.id, event.data.content);
        }
        break;

      case "session.error": {
        const failed = failRun(run.id, event.data.message);

        if (failed?.status === "failed") {
          publishRunEvent(run.id, {
            type: "run.failed",
            error: event.data.message,
          });
        }

        unsubscribe();
        break;
      }

      case "session.idle": {
        const current = getRun(run.id);

        if (!current || isTerminalRunStatus(current.status)) {
          unsubscribe();
          break;
        }

        if (event.data.aborted) {
          const cancelled = cancelRun(run.id);

          if (cancelled) {
            publishRunEvent(run.id, {
              type: "run.cancelled",
            });
          }
        } else {
          const completed = completeRun(run.id);

          if (completed) {
            publishRunEvent(run.id, {
              type: "run.completed",
              output: completed.output,
            });
          }
        }

        unsubscribe();
        break;
      }
    }
  });

  publishRunEvent(run.id, {
    type: "run.started",
  });

  try {
    const runtimeMessageId = await runtimeSession.send({
      prompt: run.prompt,
    });

    setRuntimeMessageId(run.id, runtimeMessageId);
  } catch (error) {
    unsubscribe();

    const message = getErrorMessage(error);
    const failed = failRun(run.id, message);

    if (failed) {
      publishRunEvent(run.id, {
        type: "run.failed",
        error: message,
      });
    }

    throw error;
  }
}
