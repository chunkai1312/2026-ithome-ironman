import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotClient } from "@github/copilot-sdk";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const skillsDirectory = path.join(projectDirectory, "skills");

const releaseInfo = `Release: 2026.08.21
Target environment: staging
Automated tests: 128 passed, 0 failed
Migration: required
Migration status: ready
Rollback plan: available
Known risk: refresh token rotation 尚未啟用
Risk disposition: staging 可以接受，production 前必須完成`;

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  skillDirectories: [skillsDirectory],
  availableTools: ["builtin:skill"],
});

session.on("skill.invoked", (event) => {
  console.log(`[skill] invoked name=${event.data.name}`);
});

const response = await session.sendAndWait(
  {
    prompt:
      "請使用 release-readiness-review Skill，" +
      "根據以下資料判斷目前版本是否適合部署，" +
      "並只使用提供的資訊完成評估。\n\n" +
      releaseInfo,
  },
  120_000,
);

console.log("\nReview result:");
console.log(response?.data.content);

await session.disconnect();
await client.stop();
