"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AuthGuard, { useAuthState } from "@/components/AuthGuard";
import {
  disableUser,
  enableUser,
  getAdminOverview,
  getAnomalies,
  getTopConsumers,
  getUserDetail,
  type AdminAnomalies,
  type AdminOverview,
  type AdminTopConsumers,
  type AdminUserDetail,
  type TopConsumer,
} from "@/lib/admin";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function KindBadge({ kind }: { kind: string }) {
  const isAnon = kind === "anonymous";
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        background: isAnon ? "rgba(229,115,115,0.12)" : "var(--surface-hover)",
        color: isAnon ? "#E57373" : "var(--text-muted)",
      }}
    >
      {kind}
    </span>
  );
}

function OverviewCards({ overview }: { overview: AdminOverview }) {
  const cards = [
    { label: "今日默认 Key 请求数", value: fmt(overview.defaultKeyRequests) },
    { label: "活跃用户", value: fmt(overview.activeUsers) },
    { label: "输入 tokens", value: fmt(overview.defaultKeyInputTokens) },
    { label: "输出 tokens", value: fmt(overview.defaultKeyOutputTokens) },
    { label: "单账号每日上限", value: fmt(overview.dailyLimit) },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4"
        >
          <div className="text-xs text-[var(--text-muted)]">{card.label}</div>
          <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{card.value}</div>
        </div>
      ))}
    </div>
  );
}

type ConsumerRowProps = {
  consumer: TopConsumer;
  remaining?: number;
  busy: boolean;
  onToggleDisabled: (consumer: TopConsumer) => void;
  onShowDetail: (userId: string) => void;
};

function ConsumerRow({ consumer, remaining, busy, onToggleDisabled, onShowDetail }: ConsumerRowProps) {
  const label = consumer.nickname || consumer.username || consumer.userId;
  return (
    <tr className="border-t border-[var(--border)]">
      <td className="px-3 py-2">
        <div className="text-sm text-[var(--text-primary)]">{label}</div>
        <div className="font-mono text-xs text-[var(--text-muted)]">{consumer.userId}</div>
      </td>
      <td className="px-3 py-2"><KindBadge kind={consumer.kind} /></td>
      <td className="px-3 py-2 text-right text-sm text-[var(--text-primary)]">{fmt(consumer.requests)}</td>
      {remaining !== undefined && (
        <td
          className="px-3 py-2 text-right text-sm font-medium"
          style={{ color: remaining === 0 ? "#E57373" : "var(--text-primary)" }}
        >
          {fmt(remaining)}
        </td>
      )}
      <td className="px-3 py-2 text-right text-sm text-[var(--text-muted)]">
        {fmt(consumer.inputTokens)} / {fmt(consumer.outputTokens)}
      </td>
      <td className="px-3 py-2 text-center">
        {consumer.disabled ? (
          <span className="text-xs font-medium text-[#E57373]">已禁用</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">正常</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onShowDetail(consumer.userId)}
            className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            详情
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggleDisabled(consumer)}
            className="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
            style={{
              border: `1px solid ${consumer.disabled ? "var(--border)" : "rgba(229,115,115,0.3)"}`,
              color: consumer.disabled ? "var(--text-primary)" : "#E57373",
            }}
          >
            {consumer.disabled ? "解禁" : "禁用"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function UserDetailPanel({ detail, onClose }: { detail: AdminUserDetail; onClose: () => void }) {
  const u = detail.user;
  const label = u.nickname || u.username || u.userId;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {label} <KindBadge kind={u.kind} /> {u.disabled && <span className="text-xs text-[#E57373]">（已禁用）</span>}
          </div>
          <div className="font-mono text-xs text-[var(--text-muted)]">{u.userId}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
        >
          关闭
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">按天（默认 Key）</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--text-muted)]">
                <th className="py-1">日期</th>
                <th className="py-1 text-right">请求</th>
                <th className="py-1 text-right">in/out tokens</th>
              </tr>
            </thead>
            <tbody>
              {detail.byDay.length === 0 && (
                <tr><td colSpan={3} className="py-2 text-xs text-[var(--text-muted)]">无记录</td></tr>
              )}
              {detail.byDay.map((d) => (
                <tr key={d.date} className="border-t border-[var(--border)]">
                  <td className="py-1 text-[var(--text-primary)]">{d.date}</td>
                  <td className="py-1 text-right text-[var(--text-primary)]">{fmt(d.requests)}</td>
                  <td className="py-1 text-right text-[var(--text-muted)]">{fmt(d.inputTokens)} / {fmt(d.outputTokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">按 Session（默认 Key）</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--text-muted)]">
                <th className="py-1">Session</th>
                <th className="py-1 text-right">请求</th>
                <th className="py-1 text-right">最近</th>
              </tr>
            </thead>
            <tbody>
              {detail.bySession.length === 0 && (
                <tr><td colSpan={3} className="py-2 text-xs text-[var(--text-muted)]">无记录</td></tr>
              )}
              {detail.bySession.map((s) => (
                <tr key={s.sessionId} className="border-t border-[var(--border)]">
                  <td className="py-1 font-mono text-xs text-[var(--text-primary)]">{s.sessionId.slice(0, 12)}…</td>
                  <td className="py-1 text-right text-[var(--text-primary)]">{fmt(s.requests)}</td>
                  <td className="py-1 text-right text-xs text-[var(--text-muted)]">{s.lastUsedAt ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuthState();

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [topConsumers, setTopConsumers] = useState<AdminTopConsumers | null>(null);
  const [anomalies, setAnomalies] = useState<AdminAnomalies | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const isAdmin = !loading && user?.role === "admin";

  // 非管理员（含普通登录用户）直接踢回首页。未登录由外层 AuthGuard 处理。
  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  const refetch = useCallback(async () => {
    setError("");
    try {
      const [ov, top, anom] = await Promise.all([
        getAdminOverview(),
        getTopConsumers(50),
        getAnomalies(0.8),
      ]);
      setOverview(ov);
      setTopConsumers(top);
      setAnomalies(anom);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void refetch();
    }
  }, [isAdmin, refetch]);

  const handleToggleDisabled = useCallback(
    async (consumer: TopConsumer) => {
      setBusyUserId(consumer.userId);
      setError("");
      try {
        if (consumer.disabled) {
          await enableUser(consumer.userId);
        } else {
          await disableUser(consumer.userId);
        }
        await refetch();
      } catch (e) {
        setError(e instanceof Error ? e.message : "操作失败");
      } finally {
        setBusyUserId(null);
      }
    },
    [refetch],
  );

  const handleShowDetail = useCallback(async (userId: string) => {
    setError("");
    try {
      setDetail(await getUserDetail(userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载详情失败");
    }
  }, []);

  if (loading || (user && user.role !== "admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">管理后台 · 用量监控</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              仅统计平台默认 Key（key_source=default）· {overview?.date ?? ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
          >
            刷新
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-[#E57373]/30 bg-[#E57373]/10 px-4 py-2.5 text-sm text-[#E57373]">
            {error}
          </div>
        )}

        {overview && <OverviewCards overview={overview} />}

        {anomalies && anomalies.users.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
              异常账号（今日默认 Key 用量 ≥ 上限 {Math.round(anomalies.threshold * 100)}%）
            </h2>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-panel)]">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-[var(--text-muted)]">
                    <th className="px-3 py-2">用户</th>
                    <th className="px-3 py-2">类型</th>
                    <th className="px-3 py-2 text-right">今日请求</th>
                    <th className="px-3 py-2 text-right">剩余</th>
                    <th className="px-3 py-2 text-right">in/out</th>
                    <th className="px-3 py-2 text-center">状态</th>
                    <th className="px-3 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.users.map((u) => (
                    <ConsumerRow
                      key={u.userId}
                      consumer={u}
                      remaining={u.remaining}
                      busy={busyUserId === u.userId}
                      onToggleDisabled={handleToggleDisabled}
                      onShowDetail={handleShowDetail}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {detail && <UserDetailPanel detail={detail} onClose={() => setDetail(null)} />}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
            今日默认 Key 消耗 Top {topConsumers?.limit ?? 50}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-panel)]">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)]">
                  <th className="px-3 py-2">用户</th>
                  <th className="px-3 py-2">类型</th>
                  <th className="px-3 py-2 text-right">今日请求</th>
                  <th className="px-3 py-2 text-right">in/out tokens</th>
                  <th className="px-3 py-2 text-center">状态</th>
                  <th className="px-3 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {topConsumers?.consumers.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-4 text-center text-sm text-[var(--text-muted)]">今日暂无默认 Key 用量</td></tr>
                )}
                {topConsumers?.consumers.map((c) => (
                  <ConsumerRow
                    key={c.userId}
                    consumer={c}
                    busy={busyUserId === c.userId}
                    onToggleDisabled={handleToggleDisabled}
                    onShowDetail={handleShowDetail}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminDashboard />
    </AuthGuard>
  );
}
