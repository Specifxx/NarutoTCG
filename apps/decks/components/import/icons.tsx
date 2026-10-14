type IconProps = { className?: string };

const base = (className?: string) => className ?? "h-4 w-4";

export function ErrorIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={base(className)}>
      <path
        fill="currentColor"
        d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-2.47 4.47L6.47 7.53 8.94 10l-2.47 2.47 1.06 1.06L10 11.06l2.47 2.47 1.06-1.06L11.06 10l2.47-2.47-1.06-1.06L10 8.94 7.53 6.47Z"
      />
    </svg>
  );
}

export function WarningIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={base(className)}>
      <path fill="currentColor" d="M10 2.5 18.5 17h-17L10 2.5Zm-.75 5v4.5h1.5V7.5h-1.5Zm0 6v1.5h1.5V13.5h-1.5Z" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={base(className)}>
      <path fill="currentColor" d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-.75 7v5.5h1.5V9h-1.5Zm0-3v1.5h1.5V6h-1.5Z" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={base(className)}>
      <path fill="currentColor" d="m8.25 13.19 7.72-7.72 1.06 1.06-8.78 8.78-4.78-4.78 1.06-1.06 3.72 3.72Z" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={base(className)}>
      <path fill="currentColor" d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1.25 9.69-2.47-2.47-1.06 1.06 3.53 3.53 5.78-5.78-1.06-1.06-4.72 4.72Z" />
    </svg>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={base(className)}>
      <path fill="currentColor" d="M9.25 14V5.81L6.78 8.28 5.72 7.22 10 2.94l4.28 4.28-1.06 1.06-2.47-2.47V14h-1.5ZM3 13h1.5v2.5h11V13H17v4H3v-4Z" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={base(className)}>
      <path fill="currentColor" d="M9.25 3h1.5v7.19l2.47-2.47 1.06 1.06L10 13.06 5.72 8.78l1.06-1.06 2.47 2.47V3ZM4 14.5h1.5V16h9v-1.5H16V17.5H4v-3Z" />
    </svg>
  );
}

export function FileIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={base(className)}>
      <path fill="currentColor" d="M5 2h6.6L16 6.4V18H5V2Zm1.5 1.5v13h8V7.5H11V3.5H6.5Zm6 .56V6h1.94L12.5 4.06Z" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={base(className)}>
      <path fill="currentColor" d="m5.53 4.47 4.47 4.47 4.47-4.47 1.06 1.06L11.06 10l4.47 4.47-1.06 1.06L10 11.06l-4.47 4.47-1.06-1.06L8.94 10 4.47 5.53l1.06-1.06Z" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={base(className)}>
      <path fill="currentColor" d="M7 2h9v11h-2.5v-1.5h1v-8h-6v1H7V2ZM4 6h9v12H4V6Zm1.5 1.5v9h6v-9h-6Z" />
    </svg>
  );
}
