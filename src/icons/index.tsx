import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
});
const mk = (d: React.ReactNode) =>
  function Icon({ size, ...p }: P) {
    return (
      <svg {...base(size)} {...p}>
        {d}
      </svg>
    );
  };

export const IconCheck = mk(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconX = mk(<path d="M6 6l12 12M18 6L6 18" />);
export const IconCopy = mk(<><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6a2 2 0 012-2h9" /></>);
export const IconPlay = mk(<path d="M7 5l12 7-12 7z" fill="currentColor" />);
export const IconReset = mk(<><path d="M4 12a8 8 0 108-8 8 8 0 00-6 2.7" /><path d="M4 4v4h4" /></>);
export const IconBulb = mk(<><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" /></>);
export const IconShield = mk(<><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>);
export const IconInfo = mk(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>);
export const IconWarn = mk(<><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>);
export const IconMenu = mk(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IconSun = mk(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></>);
export const IconMoon = mk(<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />);
export const IconMonitor = mk(<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>);
export const IconChevron = mk(<path d="M9 6l6 6-6 6" />);
export const IconChevronDown = mk(<path d="M6 9l6 6 6-6" />);
export const IconArrowLeft = mk(<path d="M19 12H5M11 6l-6 6 6 6" />);
export const IconArrowRight = mk(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IconArrowUp = mk(<path d="M12 19V5M6 11l6-6 6 6" />);
export const IconArrowDown = mk(<path d="M12 5v14M6 13l6 6 6-6" />);
export const IconExternal = mk(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></>);
export const IconDownload = mk(<><path d="M12 4v11M7 11l5 5 5-5" /><path d="M5 20h14" /></>);
export const IconUpload = mk(<><path d="M12 16V5M7 9l5-5 5 5" /><path d="M5 20h14" /></>);
export const IconSettings = mk(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>);
export const IconTerminal = mk(<><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M7 10l3 2-3 2M13 15h4" /></>);
export const IconLock = mk(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></>);
export const IconStar = mk(<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />);
export const IconFlag = mk(<><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></>);
export const IconList = mk(<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />);
export const IconRefresh = mk(<><path d="M20 11a8 8 0 00-14.5-3.5L4 9" /><path d="M4 4v5h5M4 13a8 8 0 0014.5 3.5L20 15" /><path d="M20 20v-5h-5" /></>);
export const IconEye = mk(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>);
export const IconSend = mk(<path d="M4 12l16-8-6 16-3-7z" />);
export const IconTrophy = mk(<><path d="M8 4h8v6a4 4 0 01-8 0zM8 6H4v1a4 4 0 004 4M16 6h4v1a4 4 0 01-4 4" /><path d="M12 14v4M8 20h8" /></>);

/** Station shapes used on the metro map and in nav: lesson ●, project ◆, ctf ⚑, test ★ */
export function StationShape({
  type,
  size = 16,
  filled,
  color,
  className,
}: {
  type: "lesson" | "project" | "ctf" | "test";
  size?: number;
  filled?: boolean;
  color?: string;
  className?: string;
}) {
  const c = color ?? "currentColor";
  const common = { fill: filled ? c : "var(--card)", stroke: c, strokeWidth: 2.2, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      {type === "lesson" && <circle cx="12" cy="12" r="8" {...common} />}
      {type === "project" && <path d="M12 2.5l9.5 9.5-9.5 9.5L2.5 12z" {...common} />}
      {type === "ctf" && <path d="M5 21V3.5M5 4.5h13l-3 4.5 3 4.5H5" {...common} />}
      {type === "test" && <path d="M12 2.8l2.8 6 6.5.8-4.8 4.5 1.3 6.5L12 17.4l-5.8 3.2 1.3-6.5L2.7 9.6l6.5-.8z" {...common} />}
    </svg>
  );
}
