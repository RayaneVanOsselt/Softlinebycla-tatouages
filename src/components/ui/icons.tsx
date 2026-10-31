import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 20, props: P) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
  ...props,
});

export const ArrowRight = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M4 12h15M14 6.5 19.5 12 14 17.5" />
  </svg>
);
export const ArrowLeft = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M20 12H5M10 6.5 4.5 12 10 17.5" />
  </svg>
);
export const ArrowUpRight = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M7 17 17 7M8.5 7H17v8.5" />
  </svg>
);
export const ChevronLeft = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="m14.5 6-6 6 6 6" />
  </svg>
);
export const ChevronRight = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="m9.5 6 6 6-6 6" />
  </svg>
);
export const Close = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const Check = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const Plus = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Play = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M8 5.5v13l10.5-6.5L8 5.5Z" />
  </svg>
);
export const Pause = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M8.5 5.5v13M15.5 5.5v13" />
  </svg>
);
export const Spark = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 2.5v19M2.5 12h19M12 7.5c.6 2.4 2.1 3.9 4.5 4.5-2.4.6-3.9 2.1-4.5 4.5-.6-2.4-2.1-3.9-4.5-4.5 2.4-.6 3.9-2.1 4.5-4.5Z" strokeWidth={0.9} />
  </svg>
);
export const Image = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m20.5 16-5-5-8.5 8.5" />
  </svg>
);
export const Mail = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
);

/* Réseaux sociaux — affichés uniquement si l'URL est configurée */
export const Instagram = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r=".6" fill="currentColor" />
  </svg>
);
export const TikTok = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M14 3.5v11.25a3.75 3.75 0 1 1-3.75-3.75M14 3.5c.4 2.6 2.1 4.3 4.75 4.6" />
  </svg>
);
export const Pinterest = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M11.2 9.5 8.8 20M9.6 14.4c3.9 1.4 6.5-.6 6.5-3.6 0-2.4-1.9-4.2-4.4-4.2-2.8 0-4.6 1.9-4.6 4.2 0 1 .4 1.9 1 2.3" />
  </svg>
);
export const Facebook = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M14.5 21v-8h2.75l.5-3.25H14.5V8c0-.9.4-1.75 1.8-1.75H18V3.4A19 19 0 0 0 15.5 3.2c-2.6 0-4.2 1.55-4.2 4.4v2.15H8.5V13h2.8v8" />
  </svg>
);
export const YouTube = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="2.75" y="5.5" width="18.5" height="13" rx="3.5" />
    <path d="m10 9.25 5 2.75-5 2.75v-5.5Z" />
  </svg>
);

export const socialIcon = { instagram: Instagram, tiktok: TikTok, pinterest: Pinterest, facebook: Facebook, youtube: YouTube } as const;
