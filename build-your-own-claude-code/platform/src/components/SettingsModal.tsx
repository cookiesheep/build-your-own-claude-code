"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  deleteApiKey,
  getApiKeySettings,
  updateApiKey,
  validateApiKey,
  type ApiKeySettings,
  type ApiKeyValidationResult,
} from "@/lib/settings";

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

type RequestState = "idle" | "loading" | "saving" | "error" | "success";
const CHOSE_DEFAULT_KEY_STORAGE_KEY = "byocc-chose-default-key";

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<ApiKeySettings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ApiKeyValidationResult | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setState("loading");
    setMessage("");
    setApiKey("");
    setApiBaseUrl("");
    setValidationResult(null);
    void getApiKeySettings()
      .then((nextSettings) => {
        setSettings(nextSettings);
        setState("idle");
      })
      .catch((error) => {
        setState("error");
        setMessage(error instanceof Error ? error.message : "无法读取 API Key 设置");
      });
  }, [open]);

  if (!open) {
    return null;
  }

  const validateCurrentApiKey = async (): Promise<ApiKeyValidationResult> => {
    if (apiKey.trim().length <= 10) {
      return { valid: false, message: "API Key 至少需要 11 个字符。" };
    }

    const trimmedApiBaseUrl = apiBaseUrl.trim();
    return validateApiKey(apiKey.trim(), trimmedApiBaseUrl || undefined);
  };

  const handleValidate = async (): Promise<ApiKeyValidationResult> => {
    setValidating(true);
    setMessage("");
    try {
      const result = await validateCurrentApiKey();
      setValidationResult(result);
      setMessage(result.warning ?? result.message ?? "");
      return result;
    } catch (error) {
      const result = {
        valid: false,
        message: error instanceof Error ? error.message : "验证请求失败",
      };
      setValidationResult(result);
      setMessage(result.message);
      return result;
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (apiKey.trim().length <= 10) {
      setState("error");
      setMessage("API Key 至少需要 11 个字符。");
      return;
    }

    setState("saving");
    setMessage("");
    try {
      const validation = await validateCurrentApiKey();
      setValidationResult(validation);
      if (!validation.valid) {
        setState("error");
        setMessage(validation.message ?? "API Key 验证失败，未保存。");
        return;
      }

      const trimmedApiBaseUrl = apiBaseUrl.trim();
      const nextSettings = await updateApiKey(
        apiKey.trim(),
        trimmedApiBaseUrl || undefined,
      );
      setSettings(nextSettings);
      setApiKey("");
      setApiBaseUrl("");
      setState("success");
      setMessage("自定义 API Key 已保存。重启实验环境后生效。");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "保存失败");
    }
  };

  const handleDelete = async () => {
    setState("saving");
    setMessage("");
    try {
      const nextSettings = await deleteApiKey();
      setSettings(nextSettings);
      setApiKey("");
      window.localStorage.removeItem(CHOSE_DEFAULT_KEY_STORAGE_KEY);
      setState("success");
      setMessage("已恢复使用平台共享 Key。重启实验环境后生效。");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "恢复默认失败");
    }
  };

  const isBusy = state === "loading" || state === "saving";
  const usesCustomKey = settings?.source === "user";
  const currentBaseUrl = settings?.apiBaseUrl || "默认 Anthropic endpoint";

  const modal = (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">API Key 设置</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              默认使用平台共享 Key。你也可以填写自己的 Key，后端会加密保存，新的实验环境启动后生效。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            关闭
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">当前状态</div>
          <div className="mt-2 text-sm text-[var(--text-primary)]">
            {state === "loading"
              ? "正在读取..."
              : usesCustomKey
                ? `当前使用自定义 Key：${settings.maskedKey ?? "已保存"}`
                : "当前使用平台共享 Key"}
          </div>
          <div className="mt-2 text-xs text-[var(--text-secondary)]">
            请求地址：{currentBaseUrl}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="api-key" className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            自定义 API Key
          </label>
          <div className="flex gap-2">
            <input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                setValidationResult(null);
              }}
              placeholder="sk-ant-..."
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => setShowKey((value) => !value)}
              className="rounded-xl border border-[var(--border)] px-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              {showKey ? "隐藏" : "显示"}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="api-base-url" className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            API Base URL（可选）
          </label>
          <input
            id="api-base-url"
            type="url"
            value={apiBaseUrl}
            onChange={(event) => setApiBaseUrl(event.target.value)}
            placeholder="https://open.bigmodel.cn/api/anthropic"
            className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
          />
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            如果使用第三方 Anthropic 兼容服务，请填写请求地址。留空时使用平台默认地址。
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void handleValidate();
            }}
            disabled={isBusy || validating || apiKey.trim().length <= 10}
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {validating ? "验证中..." : "验证 Key"}
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

        {message ? (
          <div
            className="mt-4 rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor: state === "error" ? "rgba(229,115,115,0.35)" : "rgba(72,187,120,0.35)",
              color: state === "error" ? "#E57373" : "var(--status-success)",
              background: state === "error" ? "rgba(229,115,115,0.08)" : "rgba(72,187,120,0.08)",
            }}
          >
            {message}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isBusy || validating || !usesCustomKey}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            恢复默认
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isBusy || validating}
            className="rounded-xl border border-[var(--accent-border)] bg-[var(--accent-button-bg)] px-4 py-2 text-sm font-medium text-[var(--accent-button-text)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "saving" ? "保存中..." : "保存 Key"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
