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

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8.75" cy="8.75" r="5.25" />
      <path d="m16.5 16.5-3.85-3.85" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5.5 7.75 4.5 4.5 4.5-4.5" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m12.25 5.5-4.5 4.5 4.5 4.5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m7.75 5.5 4.5 4.5-4.5 4.5" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5.5 5.5 9 9m0-9-9 9" />
    </Icon>
  );
}

export function TrendUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m2.75 14.25 5-5 3.5 3.5 6-6" />
      <path d="M12.75 6.75h4.5v4.5" />
    </Icon>
  );
}

export function TrendDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m2.75 5.75 5 5 3.5-3.5 6 6" />
      <path d="M12.75 13.25h4.5v-4.5" />
    </Icon>
  );
}

export function GemIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.75 3.25h8.5l3.5 4.5L10 16.75 2.25 7.75Z" />
      <path d="M2.25 7.75h15.5M7.75 3.25 6.5 7.75 10 16.75l3.5-9-1.25-4.5" />
    </Icon>
  );
}
