"use client";

/* ─── Icons (inline SVG, zero dependencies) ─── */

function TipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" /><path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function DangerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/* ─── Color config per type ─── */

const TYPE_CONFIG: Record<string, { icon: React.FC; cssClass: string }> = {
  tip: { icon: TipIcon, cssClass: "admonition-tip" },
  warning: { icon: WarningIcon, cssClass: "admonition-warning" },
  danger: { icon: DangerIcon, cssClass: "admonition-danger" },
  success: { icon: SuccessIcon, cssClass: "admonition-success" },
  note: { icon: NoteIcon, cssClass: "admonition-note" },
  info: { icon: NoteIcon, cssClass: "admonition-note" },
};

/* ─── Component ─── */

type AdmonitionProps = {
  admonitionType?: string;
  title?: string;
  children?: React.ReactNode;
};

export default function Admonition({ admonitionType = "note", title, children }: AdmonitionProps) {
  const config = TYPE_CONFIG[admonitionType] ?? TYPE_CONFIG.note!;
  const Icon = config.icon;

  // Handle <br/> in title — author-controlled content
  const titleHtml = title
    ? title.replace(/<br\s*\/?>/gi, "<br/>")
    : null;

  return (
    <div className={`admonition ${config.cssClass}`}>
      {(titleHtml || true) && (
        <div className="admonition-title">
          <span className="admonition-icon"><Icon /></span>
          {titleHtml ? (
            <span dangerouslySetInnerHTML={{ __html: titleHtml }} />
          ) : (
            <span>{admonitionType.charAt(0).toUpperCase() + admonitionType.slice(1)}</span>
          )}
        </div>
      )}
      <div className="admonition-content">{children}</div>
    </div>
  );
}
