const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

const tools = [
  {
    type: "function",
    name: "find_staff",
    description: "Search the QUSM Staff Database for the staff member. Use both Discord user ID and username when available. Never assume a row without checking.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string" },
        username: { type: "string" },
      },
      required: ["userId", "username"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "add_quota_minutes",
    description: "Add approved quota minutes to the verified staff record and write the approval to Mod Logs. Only use this after find_staff returns an unambiguous match.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string" },
        username: { type: "string" },
        minutes: { type: "number" },
        requestId: { type: "string" },
        proof: { type: "string" },
        approvedBy: { type: "string" },
      },
      required: ["userId", "username", "minutes", "requestId", "proof", "approvedBy"],
      additionalProperties: false,
    },
  },
];

type ToolCall = { type: string; name?: string; call_id?: string; arguments?: string };

type QuotaAgentInput = {
  userId: string;
  username: string;
  minutes: number;
  requestId: string;
  proof: string;
  approvedBy: string;
};

function sheetsUrl() {
  const url = process.env.QUOTA_GOOGLE_APPS_SCRIPT_URL?.trim();
  if (!url) throw new Error("Quota Google database is not configured");
  return url;
}

async function callSheets(payload: Record<string, unknown>) {
  const response = await fetch(sheetsUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Google database request failed (${response.status})`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Google database returned invalid JSON");
  }
}

async function runTool(call: ToolCall, input: QuotaAgentInput) {
  const args = JSON.parse(call.arguments || "{}");

  if (call.name === "find_staff") {
    return await callSheets({
      action: "find_staff",
      mode: "ai_tool",
      userId: String(args.userId || input.userId),
      username: String(args.username || input.username),
    });
  }

  if (call.name === "add_quota_minutes") {
    if (Number(args.minutes) !== input.minutes || String(args.requestId) !== input.requestId) {
      return { success: false, error: "Tool arguments did not match the approved Discord request." };
    }
    return await callSheets({
      action: "update_quota",
      mode: "ai_tool",
      userId: String(args.userId || input.userId),
      username: String(args.username || input.username),
      minutes: input.minutes,
      requestId: input.requestId,
      proof: input.proof,
      approvedBy: input.approvedBy,
    });
  }

  return { success: false, error: `Unknown AI tool: ${call.name || "unknown"}` };
}

export async function processQuotaWithAI(input: QuotaAgentInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const system = [
    "You are the QUSM quota database agent.",
    "Your job is to safely process an already-authorized quota approval.",
    "Use tools to inspect the Google Staff Database before changing anything.",
    "Never guess a staff record or row.",
    "A database update is allowed only when find_staff reports one unambiguous matching staff member.",
    "Do not change the approved minutes or request ID supplied by the server.",
    "After an update, require the tool result to confirm success.",
    "If there is ambiguity, a mismatch, or an error, stop without attempting another write.",
  ].join("\n");

  let inputMessages: any[] = [{
    role: "user",
    content: JSON.stringify({
      task: "Process this approved quota request.",
      staffUserId: input.userId,
      staffUsername: input.username,
      approvedMinutes: input.minutes,
      requestId: input.requestId,
      proof: input.proof,
      approvedBy: input.approvedBy,
    }),
  }];

  for (let step = 0; step < 6; step++) {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, instructions: system, tools, input: inputMessages }),
      cache: "no-store",
    });

    const text = await response.text();
    if (!response.ok) throw new Error(`AI agent request failed (${response.status})`);

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("AI agent returned invalid JSON");
    }

    const outputs = Array.isArray(data.output) ? data.output : [];
    const calls = outputs.filter((item: ToolCall) => item?.type === "function_call");

    if (!calls.length) {
      if (data.status === "completed") {
        return { success: true, message: data.output_text || "Quota processed by AI agent." };
      }
      throw new Error("AI agent stopped without completing the quota action");
    }

    inputMessages.push(...outputs);

    for (const call of calls) {
      const result = await runTool(call, input);
      inputMessages.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      });

      if (result?.success === false) {
        throw new Error(String(result.error || "Google database rejected the operation"));
      }
    }
  }

  throw new Error("AI agent exceeded the maximum tool steps");
}
