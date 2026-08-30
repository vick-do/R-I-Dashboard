/**
 * Thin stroke line icons on a 24px grid, sized 16/20px at the call site.
 * Kept as inline SVG rather than an icon font so nothing 404s and stroke
 * weight stays consistent with the rest of the chrome.
 */
type IconProps = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function DashboardIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function CompareIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function ApprovalsIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2l8 4.5v5c0 4.5-3.2 8.6-8 10.5-4.8-1.9-8-6-8-10.5v-5z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function ImportIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V7z" />
      <path d="M14 2v5h5" />
      <path d="M12 11v6M9.5 14.5L12 17l2.5-2.5" />
    </svg>
  );
}

export function QualityIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16h.01" />
    </svg>
  );
}

export function AdminIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
    </svg>
  );
}

export function ChevronDownIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.2} className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ className = 'h-3.5 w-3.5' }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.2} className={className}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function BellIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M18 8a6 6 0 10-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8z" />
      <path d="M13.7 20a2 2 0 01-3.4 0" />
    </svg>
  );
}

export function ExportIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3v12M8 11l4 4 4-4M4 20h16" />
    </svg>
  );
}

export function TableIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 10v10" />
    </svg>
  );
}

export function WarningIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M12 3.5L22 20H2z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function MenuIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function CloseIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function SignInIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 17l-5-5 5-5M4 12h11M13 3h5a2 2 0 012 2v14a2 2 0 01-2 2h-5" />
    </svg>
  );
}

export function SignOutIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 17l5-5-5-5M20 12H9M11 3H6a2 2 0 00-2 2v14a2 2 0 002 2h5" />
    </svg>
  );
}
