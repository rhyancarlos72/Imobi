export function Logo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="grid place-items-center rounded-[10px] bg-lime-400 text-black shadow-[0_6px_24px_-6px_rgba(198,244,50,0.7)]"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v9.5h13V10" />
          <path d="m10.5 12.5 4 2.5-4 2.5z" fill="currentColor" />
        </svg>
      </span>
      {withText && (
        <span className="font-display text-[17px] font-bold tracking-tight">
          IMOBI <span className="text-lime-400">STUDIO</span>
        </span>
      )}
    </span>
  );
}
