import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { CopilotClient, type ElicitationSchema } from "@github/copilot-sdk";

const readline = createInterface({ input, output });
const environments = ["production", "staging", "dev"];
const regions = ["ap-northeast-1", "us-east-1", "eu-west-1"];

const deploymentSchema: ElicitationSchema = {
  type: "object",
  properties: {
    environment: {
      type: "string",
      title: "部署環境",
      enum: environments,
    },
    serviceName: {
      type: "string",
      title: "服務名稱",
      minLength: 1,
    },
    region: {
      type: "string",
      title: "部署區域",
      enum: regions,
    },
    dryRun: {
      type: "boolean",
      title: "先進行試跑",
      default: true,
    },
  },
  required: ["environment", "serviceName", "region"],
};

async function selectValue(
  message: string,
  choices: string[],
): Promise<string> {
  console.log(`\n${message}`);

  choices.forEach((choice, index) => {
    console.log(`${index + 1}. ${choice}`);
  });

  while (true) {
    const answer = (await readline.question("> ")).trim();
    const index = Number(answer) - 1;

    if (choices[index]) {
      return choices[index];
    }

    if (choices.includes(answer)) {
      return answer;
    }

    console.log("請選擇提供的選項。");
  }
}

async function inputRequired(message: string): Promise<string> {
  while (true) {
    const answer = (await readline.question(message)).trim();

    if (answer) {
      return answer;
    }

    console.log("這個欄位不能為空。");
  }
}

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  availableTools: [],
  onElicitationRequest: async (context) => {
    if (context.mode && context.mode !== "form") {
      return { action: "cancel" };
    }

    console.log(`\n${context.message}`);

    const environment = await selectValue("部署環境：", environments);
    const serviceName = await inputRequired("\n服務名稱：");
    const region = await selectValue("部署區域：", regions);
    const dryRunAnswer = (
      await readline.question("\n先進行試跑？(Y/n)：")
    ).trim().toLowerCase();

    return {
      action: "accept",
      content: {
        environment,
        serviceName,
        region,
        dryRun: !["n", "no"].includes(dryRunAnswer),
      },
    };
  },
});

if (!session.capabilities.ui?.elicitation) {
  throw new Error("目前 Session 沒有可用的結構化輸入提供者。");
}

const result = await session.ui.elicitation({
  message: "請提供部署方案需要的設定",
  requestedSchema: deploymentSchema,
});

if (result.action === "accept" && result.content) {
  const response = await session.sendAndWait(
    {
      prompt:
        "請根據以下部署設定整理方案建議，" +
        "不要執行任何實際部署：\n" +
        JSON.stringify(result.content, null, 2),
    },
    120_000,
  );

  console.log("\n部署建議：");
  console.log(response?.data.content);
} else {
  console.log("\n使用者沒有提交部署設定。");
}

await session.disconnect();
await client.stop();
readline.close();
