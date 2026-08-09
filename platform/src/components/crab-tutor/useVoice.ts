"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  };

export interface VoiceCapture {
  transcript: string;
  audioDataUrl?: string;
}

interface UseVoiceOptions {
  onCapture: (capture: VoiceCapture) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("无法读取录音"));
    reader.readAsDataURL(blob);
  });
}

function friendlyRecognitionError(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "麦克风权限未开启，请在浏览器地址栏允许后重试。";
  }
  if (error === "no-speech") {
    return "没有听清，再按住麦克风说一次吧。";
  }
  if (error === "network") {
    return "浏览器语音识别服务暂时不可用，可以改用文字提问。";
  }
  return "语音识别没有完成，可以改用文字提问。";
}

export function useVoice({ onCapture, onSpeakingChange }: UseVoiceOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inputAnalyser, setInputAnalyser] = useState<AnalyserNode | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef("");
  const stopRequestedRef = useRef(false);
  const captureSentRef = useRef(false);
  const recognitionEndedRef = useRef(false);
  const audioReadyRef = useRef(false);
  const audioDataRef = useRef<string | undefined>(undefined);
  const onCaptureRef = useRef(onCapture);
  const onSpeakingChangeRef = useRef(onSpeakingChange);

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  useEffect(() => {
    onSpeakingChangeRef.current = onSpeakingChange;
  }, [onSpeakingChange]);

  const speechSupported =
    typeof window !== "undefined" &&
    Boolean(
      (window as SpeechWindow).SpeechRecognition ??
        (window as SpeechWindow).webkitSpeechRecognition,
    );

  const cleanupInput = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setInputAnalyser(null);
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close();
    }
  }, []);

  const maybeFinishCapture = useCallback(() => {
    if (
      captureSentRef.current ||
      !recognitionEndedRef.current ||
      !audioReadyRef.current
    ) {
      return;
    }

    captureSentRef.current = true;
    const transcript = transcriptRef.current.trim();
    if (transcript) {
      onCaptureRef.current({
        transcript,
        audioDataUrl: audioDataRef.current,
      });
    } else {
      setError("没有听清，再按住麦克风说一次吧。");
    }
    setInterimTranscript("");
    cleanupInput();
  }, [cleanupInput]);

  const stopListening = useCallback(() => {
    stopRequestedRef.current = true;
    setIsListening(false);

    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        recognitionEndedRef.current = true;
      }
    } else {
      recognitionEndedRef.current = true;
    }

    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.stop();
    } else {
      audioReadyRef.current = true;
    }

    window.setTimeout(() => {
      recognitionEndedRef.current = true;
      audioReadyRef.current = true;
      maybeFinishCapture();
    }, 900);
  }, [maybeFinishCapture]);

  const startListening = useCallback(async () => {
    setError(null);
    if (!speechSupported) {
      setError("当前浏览器不支持 SpeechRecognition，请使用最新版 Chrome 或文字提问。");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("当前页面无法访问麦克风，请确认使用 HTTPS 或 localhost。 ");
      return;
    }

    stopRequestedRef.current = false;
    captureSentRef.current = false;
    recognitionEndedRef.current = false;
    audioReadyRef.current = false;
    audioDataRef.current = undefined;
    transcriptRef.current = "";
    chunksRef.current = [];
    setInterimTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      setInputAnalyser(analyser);

      if (typeof MediaRecorder !== "undefined") {
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = async () => {
          try {
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
            audioDataRef.current = blob.size ? await readBlobAsDataUrl(blob) : undefined;
          } catch {
            audioDataRef.current = undefined;
          } finally {
            audioReadyRef.current = true;
            maybeFinishCapture();
          }
        };
        recorder.start(160);
      } else {
        audioReadyRef.current = true;
      }

      const SpeechRecognition =
        (window as SpeechWindow).SpeechRecognition ??
        (window as SpeechWindow).webkitSpeechRecognition;
      if (!SpeechRecognition) throw new Error("SpeechRecognition unavailable");

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "zh-CN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = result[0]?.transcript ?? "";
          if (result.isFinal) transcriptRef.current += text;
          else interim += text;
        }
        setInterimTranscript(`${transcriptRef.current}${interim}`.trim());
      };
      recognition.onerror = (event) => {
        setError(friendlyRecognitionError(event.error));
      };
      recognition.onend = () => {
        recognitionEndedRef.current = true;
        recognitionRef.current = null;
        maybeFinishCapture();
      };
      recognition.start();
      setIsListening(true);

      if (stopRequestedRef.current) stopListening();
    } catch (caught) {
      cleanupInput();
      setIsListening(false);
      setError(
        caught instanceof DOMException && caught.name === "NotAllowedError"
          ? "麦克风权限未开启，请在浏览器地址栏允许后重试。"
          : "麦克风启动失败，可以先使用文字提问。",
      );
    }
  }, [cleanupInput, maybeFinishCapture, speechSupported, stopListening]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    onSpeakingChangeRef.current?.(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      stopSpeaking();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 0.96;
      utterance.pitch = 1.04;
      const voices = window.speechSynthesis.getVoices();
      utterance.voice =
        voices.find((voice) => /zh-CN/i.test(voice.lang)) ??
        voices.find((voice) => /^zh/i.test(voice.lang)) ??
        null;
      utterance.onstart = () => {
        setIsSpeaking(true);
        onSpeakingChangeRef.current?.(true);
      };
      const finish = () => {
        setIsSpeaking(false);
        onSpeakingChangeRef.current?.(false);
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    },
    [stopSpeaking],
  );

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      cleanupInput();
    },
    [cleanupInput],
  );

  return {
    speechSupported,
    isListening,
    isSpeaking,
    interimTranscript,
    error,
    inputAnalyser,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
