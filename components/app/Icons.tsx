import type { ReactNode } from "react";

type Props = { size?: number; children: ReactNode };

function Icon({ size = 22, children }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

// Tracciati da design/Taglendo App.dc.html (barra laterale).
export const CalendarIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </Icon>
);
export const UsersIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
    <path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.8c1.9.7 3.1 2.4 3.5 5.2" />
  </Icon>
);
export const LinkIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
  </Icon>
);
/** Campanella: le notifiche del salone. */
export const BellNavIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
  </Icon>
);
/** Casa: il sito di Taglendo. */
export const HomeIcon = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19z" />
  </Icon>
);
/** Vetrina del negozio: la sezione «Salone». */
export const StoreIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M4 9.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19V9.5" />
    <path d="M3 9.5 4.6 4.5h14.8L21 9.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" />
    <path d="M10 20.5v-5h4v5" />
  </Icon>
);
export const ScissorsIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="6" cy="6.5" r="2.8" />
    <circle cx="6" cy="17.5" r="2.8" />
    <path d="M8.3 8.2 20 18M8.3 15.8 20 6" />
  </Icon>
);
export const CopyIcon = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
    <path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
  </Icon>
);
export const CheckIcon = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);
export const LogoutIcon = ({ size = 21 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
    <path d="M14 16l4-4-4-4M18 12H9" />
  </Icon>
);
export const SettingsIcon = ({ size = 21 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Icon>
);
export const StatsIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M4 20V11M10 20V5M16 20v-6M21 20H3" />
  </Icon>
);
export const MenuIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Icon>
);
export const CloseIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const SettingsRaysIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </Icon>
);
export const CheckMarkIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}>
    <path d="m5 12 5 5 9-10" />
  </Icon>
);
export const LogoutMenuIcon = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 17l5-5-5-5M15 12H4" />
  </Icon>
);
