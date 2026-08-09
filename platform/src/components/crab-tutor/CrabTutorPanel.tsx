"use client";

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  askMiniCPMTutor,
  isMiniCPMDemoMode,
  type MiniCPMTutorRequest,
  type VisionAnnotation,
} from "@/lib/minicpm-client";
import {
  CRAB_TUTOR_WELCOME,
  type TutorModality,
} from "./crabTutorMessages";
import VoiceWaveform from "./VoiceWaveform";
import { useVision, type VisionCapture } from "./useVision";
import { useVoice, type VoiceCapture } from "./useVoice";
import "./crab-tutor.css";

interface CrabTutorPanelProps {
  open: boolean;
  onClose: () => void;
  onSpeakingChange: (speaking: boolean) => void;
}

interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  modalities: TutorModality[];
  screenshot?: string;
  annotations?: VisionAnnotation[];
  error?: boolean;
}

const initialMessage: TutorMessage = {
  id: "crab-welcome",
  role: "assistant",
  text: CRAB_TUTOR_WELCOME,
  modalities: ["视觉", "语音", "文本"],
};

function createMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function uniqueModalities(modalities: TutorModality[]): TutorModality[] {
  return Array.from(new Set(modalities));
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12L20 4l-6.2 16-2.6-6.8L4 12z" />
      <path d="M11.2 13.2L20 4" />
    </svg>
  );
}

function MicrophoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0012 0M12 17v4M9 21h6" />
    </svg>
  );
}

function VisionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12s3.2-6 9-6 9 6 9 6-3.2 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.7" />
      <path d="M4 4h4M4 4v4M20 4h-4M20 4v4" />
    </svg>
  );
}

function VisionPreview({
  src,
  annotations = [],
}: {
  src: string;
  annotations?: VisionAnnotation[];
}) {
  return (
    <figure className="crab-tutor-vision-preview">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="蟹老师截取的当前页面" />
      <figcaption>AI 视觉标注</figcaption>
      {annotations.map((annotation, index) => (
        <span
          key={annotation.id}
          className="crab-tutor-vision-mark"
          style={{
            left: `${annotation.x}%`,
            top: `${annotation.y}%`,
            width: `${annotation.width}%`,
            height: `${annotation.height}%`,
          }}
        >
          <b>{String(index + 1).padStart(2, "0")}</b>
          <em>{annotation.label}</em>
        </span>
      ))}
    </figure>
  );
}

export default function CrabTutorPanel({
  open,
  onClose,
  onSpeakingChange,
}: CrabTutorPanelProps) {
  const [messages, setMessages] = useState<TutorMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const voiceCaptureHandlerRef = useRef<(capture: VoiceCapture) => void>(() => {});
  const { captureViewport, isCapturing, error: visionError } = useVision();
  const {
    isListening,
    isSpeaking,
    interimTranscript,
    error: voiceError,
    inputAnalyser,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useVoice({
    onCapture: (capture) => voiceCaptureHandlerRef.current(capture),
    onSpeakingChange,
  });

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, pending]);

  useEffect(() => {
    if (open) return;
    abortRef.current?.abort();
    stopSpeaking();
    if (isListening) stopListening();
  }, [isListening, open, stopListening, stopSpeaking]);

  const ask = useCallback(
    async ({
      text,
      modalities,
      imageDataUrl,
      audioDataUrl,
      visibleHeadings,
      annotations,
    }: MiniCPMTutorRequest) => {
      const question = text.trim();
      if (!question || pending) return;

      stopSpeaking();
      setStatus(null);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId("user"),
          role: "user",
          text: question,
          modalities: uniqueModalities(modalities),
          screenshot: imageDataUrl,
          annotations,
        },
      ]);
      setPending(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const reply = await askMiniCPMTutor(
          {
            text: question,
            modalities,
            imageDataUrl,
            audioDataUrl,
            visibleHeadings,
            annotations,
          },
          controller.signal,
        );
        setMessages((current) => [
          ...current,
          {
            id: createMessageId("assistant"),
            role: "assistant",
            text: reply.text,
            modalities: reply.modalities,
          },
        ]);
        speak(reply.text);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        const message =
          caught instanceof Error ? caught.message : "模型连接暂时不可用";
        setMessages((current) => [
          ...current,
          {
            id: createMessageId("assistant-error"),
            role: "assistant",
            text: `${message}。你仍可以清空 NEXT_PUBLIC_MINICPM_API_URL，切回本地 Demo 模式。`,
            modalities: ["文本"],
            error: true,
          },
        ]);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setPending(false);
        }
      }
    },
    [pending, speak, stopSpeaking],
  );

  useEffect(() => {
    voiceCaptureHandlerRef.current = ({ transcript, audioDataUrl }) => {
      setStatus(`已听到：${transcript}`);
      void ask({
        text: transcript,
        modalities: ["语音", "文本"],
        audioDataUrl,
      });
    };
  }, [ask]);

  const submitText = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;
    setInput("");
    void ask({ text: question, modalities: ["文本"] });
  };

  const askAboutScreen = async () => {
    if (pending || isCapturing) return;
    setStatus("正在读取当前可视区…");
    const capture: VisionCapture | null = await captureViewport();
    if (!capture) {
      setStatus(null);
      return;
    }
    setStatus(`已识别 ${capture.annotations.length} 个视觉关注区域`);
    await ask({
      text: "请看看我当前在学习什么，并用一个问题提示我下一步。",
      modalities: ["视觉", "文本"],
      imageDataUrl: capture.dataUrl,
      visibleHeadings: capture.visibleHeadings,
      annotations: capture.annotations,
    });
  };

  const handleVoicePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pending) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    void startListening();
  };

  const handleVoicePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopListening();
  };

  const liveError = voiceError ?? visionError;

  return (
    <section
      className={`crab-tutor-panel${open ? " is-open" : ""}`}
      aria-hidden={!open}
      aria-label="蟹老师全模态助教"
      inert={!open ? true : undefined}
    >
      <div className="crab-tutor-panel-inner">
        <header className="crab-tutor-header">
          <div>
            <span className="crab-tutor-kicker">BYOCC LEARNING GUIDE</span>
            <h2>蟹老师 · 全模态助教</h2>
          </div>
          <div className="crab-tutor-header-actions">
            <span className="crab-tutor-model-badge">
              <small>Powered by</small>
              MiniCPM-o 4.5
            </span>
            <button
              type="button"
              className="crab-tutor-close"
              onClick={onClose}
              aria-label="关闭蟹老师"
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="crab-tutor-intro">
          <span aria-hidden="true">看</span>
          <i />
          <span aria-hidden="true">听</span>
          <i />
          <span aria-hidden="true">说</span>
          <p>边看屏幕、边听你说话、边讲解的 Agent 学习向导</p>
          {isMiniCPMDemoMode && <b>Demo</b>}
        </div>

        <div className="crab-tutor-conversation" aria-live="polite">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`crab-tutor-message is-${message.role}${message.error ? " is-error" : ""}`}
            >
              <span className="crab-tutor-message-author">
                {message.role === "assistant" ? "蟹老师" : "你"}
              </span>
              {message.screenshot && (
                <VisionPreview
                  src={message.screenshot}
                  annotations={message.annotations}
                />
              )}
              <p>{message.text}</p>
              <footer>
                {message.modalities.map((modality) => (
                  <span key={modality}>{modality}</span>
                ))}
              </footer>
            </article>
          ))}
          {pending && (
            <article className="crab-tutor-message is-assistant is-thinking">
              <span className="crab-tutor-message-author">蟹老师正在推演</span>
              <p>
                <i />
                <i />
                <i />
              </p>
            </article>
          )}
          <div ref={messageEndRef} />
        </div>

        {(isListening || isSpeaking) && (
          <div className="crab-tutor-live-strip" role="status">
            <span>{isListening ? "正在听你说" : "蟹老师正在说话"}</span>
            <VoiceWaveform
              active
              analyser={isListening ? inputAnalyser : null}
              variant={isListening ? "listening" : "speaking"}
            />
          </div>
        )}

        {(interimTranscript || status || liveError) && (
          <p className={`crab-tutor-status${liveError ? " is-error" : ""}`}>
            {liveError || interimTranscript || status}
          </p>
        )}

        <div className="crab-tutor-composer">
          <form onSubmit={submitText} className="crab-tutor-text-entry">
            <label htmlFor="crab-tutor-input">文字提问</label>
            <div>
              <input
                id="crab-tutor-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="问问 Agent Loop…"
                autoComplete="off"
                disabled={pending}
              />
              <button type="submit" disabled={pending || !input.trim()} aria-label="发送问题">
                <SendIcon />
              </button>
            </div>
          </form>

          <button
            type="button"
            className={`crab-tutor-mode-button is-voice${isListening ? " is-active" : ""}`}
            onPointerDown={handleVoicePointerDown}
            onPointerUp={handleVoicePointerUp}
            onPointerCancel={handleVoicePointerUp}
            disabled={pending}
            aria-label="按住语音说话，松开发送"
          >
            <MicrophoneIcon />
            <span>{isListening ? "松开发送" : "按住说话"}</span>
            <small>语音</small>
          </button>

          <button
            type="button"
            className="crab-tutor-mode-button is-vision"
            onClick={() => void askAboutScreen()}
            disabled={pending || isCapturing}
            aria-label="截取并分析当前屏幕"
          >
            <VisionIcon />
            <span>{isCapturing ? "正在看…" : "看屏幕"}</span>
            <small>视觉</small>
          </button>
        </div>
      </div>
    </section>
  );
}
