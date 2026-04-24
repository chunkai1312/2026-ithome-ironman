import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  streaming: true,
});

session.on("assistant.message_delta", (event) => {
  process.stdout.write(event.data.deltaContent);
});

await session.sendAndWait({
  prompt: "請用三點說明 GitHub Copilot SDK 適合哪些 Agent 應用情境。",
});

process.stdout.write("\n");

await session.disconnect();
await client.stop();
