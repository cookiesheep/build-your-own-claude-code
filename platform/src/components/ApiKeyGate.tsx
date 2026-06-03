"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  getApiKeySettings,
  getApiKeyStatus,
  updateApiKey,
  validateApiKey,
  type ApiKeySettings,
  type ApiKeyStatus,
  type ApiKeyValidationResult,
} from "@/lib/settings";

type ApiKeyGateProps = {
  labId: number;
  children: ReactNode;
};

type GateState = "loading" | "need-setup" | "ready";
type KeyMode = "default" | "user";

const CHOSE_DEFAULT_KEY_STORAGE_KEY = "byocc-chose-default-key";

const API_PRESETS = [
  { name: "Anthropic", url: "https://api.anthropic.com" },
  { name: "智谱 AI", url: "https://open.bigmodel.cn/api/anthropic" },
  { name: "DeepSeek", url: "https://api.deepseek.com/anthropic" },
  { name: "自定义", url: "" },
];

function LoadingPanel() {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-5 py-4 text-sm text-[var(--text-secondary)]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        正在检查 API Key 状态...
      </div>
    </div>
  );
}

export default function ApiKeyGate({ labId, children }: ApiKeyGateProps) {
  const [gateState, setGateState] = useState<GateState>("loading");
  const [settings, setSettings] = useState<ApiKeySettings | null>(null);
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [mode, setMode] = useState<KeyMode>("default");
  const [apiKey, setApiKey] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState(API_PRESETS[0].url);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [validationResult, setValidationResult] = useState<ApiKeyValidationResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const [nextSettings, nextStatus] = await Promise.all([
          getApiKeySettings(),
          getApiKeyStatus().catch(() => null),
        ]);
        if (cancelled) {
          return;
        }

        setSettings(nextSettings);
        setStatus(nextStatus);
        if (nextSettings.source === "user" && nextSettings.hasKey) {
          setGateState("ready");
          return;
        }

        const choseDefault = window.localStorage.getItem(CHOSE_DEFAULT_KEY_STORAGE_KEY);
        setGateState(choseDefault === "true" ? "ready" : "need-setup");
      } catch {
        if (!cancelled) {
          setGateState("ready");
        }
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [labId]);

  if (gateState === "ready") {
    return <>{children}</>;
  }

  if (gateState === "loading") {
    return <LoadingPanel />;
  }

  const handleChooseDefault = () => {
    window.localStorage.setItem(CHOSE_DEFAULT_KEY_STORAGE_KEY, "true");
    setGateState("ready");
  };

  const handleValidate = async (): Promise<ApiKeyValidationResult> => {
    const trimmedKey = apiKey.trim();
    const trimmedBaseUrl = apiBaseUrl.trim();
    if (trimmedKey.length <= 10) {
      return { valid: false, message: "API Key 至少需要 11 个字符。" };
    }

    const result = await validateApiKey(trimmedKey, trimmedBaseUrl || undefined);
    setValidationResult(result);
    return result;
  };

  const handleConfirm = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (mode === "default") {
        handleChooseDefault();
        return;
      }

      const result = await handleValidate();
      if (!result.valid) {
        setMessage(result.message ?? "API Key 验证失败。");
        return;
      }

      await updateApiKey(apiKey.trim(), apiBaseUrl.trim() || undefined);
      window.localStorage.removeItem(CHOSE_DEFAULT_KEY_STORAGE_KEY);
      setGateState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "API Key 设置失败。");
    } finally {
      setBusy(false);
    }
  };

  const currentRemaining = status?.remaining ?? 500;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-[540px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
        <div className="text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-button-bg)] text-lg text-[var(--accent)]">
            🔑
          </div>
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">配置 API Key</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            开始 Lab {labId} 前，选择平台共享额度或填写自己的 Anthropic 兼容 Key。
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => setMode("default")}
            className="w-full rounded-2xl border p-4 text-left transition-colors hover:bg-[var(--surface-hover)]"
            style={{
              borderColor: mode === "default" ? "var(--accent-border)" : "var(--border)",
              background: mode === "default" ? "var(--accent-button-bg)" : "var(--bg-card)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm">{mode === "default" ? "●" : "○"}</span>
              <span className="font-medium text-[var(--text-primary)]">使用平台共享 Key</span>
              <span className="ml-auto rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                剩余 {currentRemaining} 次
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              适合体验和学习，平台共享 Key 有每日调用上限。
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("user")}
            className="w-full rounded-2xl border p-4 text-left transition-colors hover:bg-[var(--surface-hover)]"
            style={{
              borderColor: mode === "user" ? "var(--accent-border)" : "var(--border)",
              background: mode === "user" ? "var(--accent-button-bg)" : "var(--bg-card)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm">{mode === "user" ? "●" : "○"}</span>
              <span className="font-medium text-[var(--text-primary)]">使用自己的 API Key</span>
              {settings?.apiBaseUrl ? (
                <span className="ml-auto text-[10px] text-[var(--text-muted)]">已有地址</span>
              ) : null}
            </div>
          </button>
        </div>

        {mode === "user" ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label htmlFor="gate-api-key" className="block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              API Key
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="gate-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setValidationResult(null);
                }}
                placeholder="sk-ant-..."
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShowKey((value) => !value)}
                className="rounded-xl border border-[var(--border)] px-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                {showKey ? "隐藏" : "显示"}
              </button>
            </div>

            <label htmlFor="gate-api-preset" className="mt-4 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Base URL
            </label>
            <select
              id="gate-api-preset"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            >
              {API_PRESETS.map((preset) => (
                <option key={preset.name} value={preset.url}>
                  {preset.name}
                </option>
              ))}
            </select>
            <input
              type="url"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              placeholder="https://api.anthropic.com"
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy || apiKey.trim().length <= 10}
                onClick={() => {
                  setBusy(true);
                  setMessage("");
                  void handleValidate()
                    .then((result) => {
                      setMessage(result.warning ?? result.message ?? "");
                    })
                    .catch((error) => {
                      setValidationResult({ valid: false, message: "验证请求失败" });
                      setMessage(error instanceof Error ? error.message : "验证请求失败");
                    })
                    .finally(() => setBusy(false));
                }}
                className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "验证中..." : "验证 Key"}
              </button>
              {validationResult ? (
                <span
                  className="text-sm"
                  style={{ color: validationResult.valid ? "var(--status-success)" : "#E57373" }}
                >
                  {validationResult.valid ? "Key 有效" : validationResult.message ?? "Key 无效"}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {message ? (
          <div
            className="mt-4 rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor: message.includes("失败") || message.includes("无效")
                ? "rgba(229,115,115,0.35)"
                : "rgba(72,187,120,0.35)",
              color: message.includes("失败") || message.includes("无效")
                ? "#E57373"
                : "var(--status-success)",
              background: message.includes("失败") || message.includes("无效")
                ? "rgba(229,115,115,0.08)"
                : "rgba(72,187,120,0.08)",
            }}
          >
            {message}
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void handleConfirm();
          }}
          className="mt-6 w-full rounded-xl border border-[var(--accent-border)] bg-[var(--accent-button-bg)] px-4 py-3 text-sm font-medium text-[var(--accent-button-text)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "处理中..." : "确认并开始实验"}
        </button>
      </div>
    </div>
  );
}
