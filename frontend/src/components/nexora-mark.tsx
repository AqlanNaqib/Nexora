export function NexoraMark({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <line x1="6" y1="6" x2="18" y2="9" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
      <line x1="18" y1="9" x2="9" y2="18" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
      <line x1="6" y1="6" x2="9" y2="18" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
      <circle cx="6" cy="6" r="2.25" fill="currentColor" />
      <circle cx="18" cy="9" r="2.25" fill="currentColor" />
      <circle cx="9" cy="18" r="2.25" fill="currentColor" />
    </svg>
  );
}
