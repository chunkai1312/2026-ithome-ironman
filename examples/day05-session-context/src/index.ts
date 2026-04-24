import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
});

console.log(`Session: ${session.sessionId}`);

const firstResponse = await session.sendAndWait({
  prompt: "台灣最高的山是哪一座？請簡短回答。",
});

console.log("\n第一次回應：");
console.log(firstResponse?.data.content);

const secondResponse = await session.sendAndWait({
  prompt: "那日本呢？",
});

console.log("\n第二次回應：");
console.log(secondResponse?.data.content);

await session.disconnect();
await client.stop();
