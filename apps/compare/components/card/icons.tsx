import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11.25 3.75h5v5" />
      <path d="m16 4-7.25 7.25" />
      <path d="M14.25 11.5v3.25a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5H8.5" />
    </Icon>
  );
}

/** Price tag with a check: marks the cheapest offer. */
export function BestPriceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.25 10.4V4.25a1 1 0 0 1 1-1h6.15a1 1 0 0 1 .7.3l5.6 5.6a1 1 0 0 1 0 1.4l-6.15 6.15a1 1 0 0 1-1.4 0l-5.6-5.6a1 1 0 0 1-.3-.7Z" />
      <path d="m6.75 9.75 1.75 1.75 3.25-3.5" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="6.75" />
      <path d="M10 6.25V10l2.5 1.5" />
    </Icon>
  );
}

export function TableIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.25" y="4.25" width="13.5" height="11.5" rx="1.5" />
      <path d="M3.25 8.25h13.5M3.25 12h13.5M8.25 8.25v7.5" />
    </Icon>
  );
}
