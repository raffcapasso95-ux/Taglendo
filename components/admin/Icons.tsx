import type { ReactElement } from "react";

const PATHS: Record<string, ReactElement> = {
  more: (
    <>
      <circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
  open: <path d="M5 12h14M13 6l6 6-6 6" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.8A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.2 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.700-.3 3.800-.8" />
      <path d="M10 10a2.800 2.800 0 0 0 4 4" />
    </>
  ),
  pause: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m10.500 8.800 4.500 3.200-4.500 3.200Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.500V12l3 2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  note: (
    <>
      <path d="M6 3.500h9l3.500 3.500v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15.500a1 1 0 0 1 1-1Z" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  userBlock: (
    <>
      <circle cx="9" cy="8" r="3.300" />
      <path d="M2.800 20c.4-3.500 3-5.600 6.200-5.600 1.200 0 2.300.3 3.200.8" />
      <circle cx="17.500" cy="16.500" r="3.800" />
      <path d="m14.800 19.200 5.400-5.400" />
    </>
  ),
  userCheck: (
    <>
      <circle cx="9" cy="8" r="3.300" />
      <path d="M2.800 20c.4-3.500 3-5.600 6.200-5.600 1.200 0 2.300.3 3.200.8" />
      <path d="m14.500 17 2 2 4-4.200" />
    </>
  ),
  shieldOff: (
    <>
      <path d="M12 3.500 5 6v5.500c0 4.200 2.800 7.500 7 9 1.500-.5 2.800-1.300 3.900-2.300M19 11.500V6l-7-2.500" />
      <path d="M4 4l16 16" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.500 5 6v5.500c0 4.200 2.800 7.500 7 9 4.200-1.500 7-4.800 7-9V6l-7-2.500Z" />
      <path d="m9 12 2.200 2.200L15.200 10" />
    </>
  ),
  table: (
    <>
      <rect x="3.500" y="4.500" width="17" height="15" rx="2" />
      <path d="M3.500 10h17M3.500 15h17M9.500 10v9.500" />
    </>
  ),
  cards: (
    <>
      <rect x="3.500" y="3.500" width="7" height="7" rx="1.500" />
      <rect x="13.500" y="3.500" width="7" height="7" rx="1.500" />
      <rect x="3.500" y="13.500" width="7" height="7" rx="1.500" />
      <rect x="13.500" y="13.500" width="7" height="7" rx="1.500" />
    </>
  ),
};

/** Le icone del gestionale: tratto sottile, colore del testo. */
export function Icon({ name, size = 18 }: { name: keyof typeof PATHS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
