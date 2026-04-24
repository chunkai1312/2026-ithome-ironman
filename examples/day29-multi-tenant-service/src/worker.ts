import {
  claimNextRun,
  failRun,
  publishRunEvent,
} from "./run-store.js";
import { getApplicationSession } from "./store.js";
import { startRun } from "./run-manager.js";

const WORKER_POLL_INTERVAL_MS = 200;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "未知的 Worker 錯誤";
}

function startWorker(workerId: string): NodeJS.Timeout {
  let dispatching = false;

  const poll = async () => {
    if (dispatching) {
      return;
    }

    const run = claimNextRun(workerId);

    if (!run) {
      return;
    }

    dispatching = true;

    try {
      const session = getApplicationSession(run.sessionId);

      if (!session) {
        const message = "找不到對應的 Application Session";

        failRun(run.id, message);
        publishRunEvent(run.id, {
          type: "run.failed",
          error: message,
        });
        return;
      }

      console.log(
        `[${workerId}] run=${run.id} session=${session.id} runtime=${session.runtimeId}`,
      );

      await startRun(run, session);
    } catch (error) {
      console.error(`[${workerId}] ${getErrorMessage(error)}`);
    } finally {
      dispatching = false;
    }
  };

  return setInterval(() => void poll(), WORKER_POLL_INTERVAL_MS);
}

export function startWorkers(count = 2): NodeJS.Timeout[] {
  return Array.from(
    { length: count },
    (_, index) => startWorker(`worker-${index + 1}`),
  );
}
