import {
  createDemoTutorReply,
  type TutorModality,
} from "@/components/crab-tutor/crabTutorMessages";

export interface VisionAnnotation {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MiniCPMTutorRequest {
  text: string;
  modalities: TutorModality[];
  imageDataUrl?: string;
  audioDataUrl?: string;
  visibleHeadings?: string[];
  annotations?: VisionAnnotation[];
}

export interface MiniCPMTutorResponse {
  text: string;
  modalities: TutorModality[];
  demo: boolean;
  model: string;
  audioDataUrl?: string;
}

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
      audio?: { data?: string };
    };
  }>;
  text?: string;
  modalities?: TutorModality[];
  demo?: boolean;
  model?: string;
  audioDataUrl?: string;
  error?: { message?: string } | string;
}

const API_URL = process.env.NEXT_PUBLIC_MINICPM_API_URL?.trim() ?? "";
const API_KEY = process.env.NEXT_PUBLIC_MINICPM_API_KEY?.trim() ?? "";
const MODEL = process.env.NEXT_PUBLIC_MINICPM_MODEL?.trim() || "MiniCPM-O-4.5-9B";

const SYSTEM_PROMPT = `你是 BYOCC 的“蟹老师”，专门辅导高校学生理解 Agent Harness。
采用苏格拉底式引导：优先提出一个精准问题或给出一个小提示，不直接交付完整答案。
内容围绕消息协议、tool_use/tool_result、Agent Loop、规划、子 Agent 和上下文压缩。
回答使用简洁中文，控制在 120 字以内。如果收到屏幕截图，先指出你看到的学习主题，再给引导问题。`;

export const isMiniCPMDemoMode = API_URL.length === 0;

function uniqueModalities(modalities: TutorModality[]): TutorModality[] {
  return Array.from(new Set(modalities));
}

function dataUrlPayload(dataUrl: string): { data: string; format: string } {
  const [metadata, data = ""] = dataUrl.split(",", 2);
  const mime = metadata.match(/^data:audio\/([^;]+)/)?.[1] ?? "webm";
  return { data, format: mime.replace("x-", "") };
}

function resolveEndpoint(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  if (/\/v1$/i.test(trimmed)) {
    return `${trimmed}/chat/completions`;
  }
  return trimmed;
}

function buildContent(request: MiniCPMTutorRequest): Array<Record<string, unknown>> {
  const content: Array<Record<string, unknown>> = [
    { type: "text", text: request.text },
  ];

  if (request.imageDataUrl) {
    content.push({
      type: "image_url",
      image_url: { url: request.imageDataUrl },
    });
  }

  if (request.audioDataUrl) {
    content.push({
      type: "input_audio",
      input_audio: dataUrlPayload(request.audioDataUrl),
    });
  }

  if (request.visibleHeadings?.length) {
    content.push({
      type: "text",
      text: `当前视口可见标题：${request.visibleHeadings.join(" / ")}`,
    });
  }

  return content;
}

function extractText(payload: OpenAIResponse): string | null {
  if (typeof payload.text === "string" && payload.text.trim()) {
    return payload.text.trim();
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim() || null;
  }
  if (Array.isArray(content)) {
    const text = content
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("")
      .trim();
    return text || null;
  }
  return null;
}

function extractError(payload: OpenAIResponse): string | null {
  if (typeof payload.error === "string") return payload.error;
  if (payload.error && typeof payload.error.message === "string") {
    return payload.error.message;
  }
  return null;
}

function demoResponse(request: MiniCPMTutorRequest): MiniCPMTutorResponse {
  const reply = createDemoTutorReply(request.text, request.visibleHeadings);
  return {
    text: request.imageDataUrl
      ? `我看到你正在浏览「${request.visibleHeadings?.[0] ?? "BYOCC Agent 学习内容"}」。${reply.text}`
      : reply.text,
    modalities: uniqueModalities(request.modalities),
    demo: true,
    model: `${MODEL} · Demo`,
  };
}

export async function askMiniCPMTutor(
  request: MiniCPMTutorRequest,
  signal?: AbortSignal,
): Promise<MiniCPMTutorResponse> {
  if (isMiniCPMDemoMode) {
    await new Promise((resolve) => window.setTimeout(resolve, 520));
    return demoResponse(request);
  }

  const response = await fetch(resolveEndpoint(API_URL), {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildContent(request) },
      ],
      temperature: 0.45,
      max_tokens: 220,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;
  if (!response.ok) {
    throw new Error(extractError(payload) ?? `MiniCPM 请求失败（${response.status}）`);
  }

  const text = extractText(payload);
  if (!text) {
    throw new Error("MiniCPM 返回了空回复");
  }

  const audioData = payload.choices?.[0]?.message?.audio?.data;
  return {
    text,
    modalities: uniqueModalities(payload.modalities ?? request.modalities),
    demo: payload.demo ?? false,
    model: payload.model ?? MODEL,
    audioDataUrl:
      payload.audioDataUrl ??
      (audioData ? `data:audio/wav;base64,${audioData}` : undefined),
  };
}
