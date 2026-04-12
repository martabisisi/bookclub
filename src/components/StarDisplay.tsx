type StarDisplayProps = {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "text-sm gap-0.5",
  md: "text-lg gap-0.5",
  lg: "text-3xl sm:text-4xl gap-1",
};

function StarCell({
  portion,
  size,
}: {
  portion: number;
  size: "sm" | "md" | "lg";
}) {
  const em =
    size === "lg" ? "1em" : size === "md" ? "0.95em" : "0.85em";

  if (portion <= 0) {
    return (
      <span className="text-ink-muted/40" aria-hidden>
        ☆
      </span>
    );
  }
  if (portion >= 1) {
    return (
      <span className="text-cocoa" aria-hidden>
        ★
      </span>
    );
  }
  return (
    <span
      className="relative inline-block align-middle text-cocoa"
      style={{ width: em, height: em }}
      aria-hidden
    >
      <span className="pointer-events-none absolute left-0 top-0 text-ink-muted/40">
        ☆
      </span>
      <span
        className="absolute left-0 top-0 overflow-hidden text-cocoa"
        style={{ width: "50%" }}
      >
        ★
      </span>
    </span>
  );
}

export function StarDisplay({
  value,
  size = "md",
  className = "",
}: StarDisplayProps) {
  const v = Math.min(5, Math.max(0, value));

  return (
    <div
      className={`flex items-center text-cocoa ${sizeMap[size]} ${className}`}
      aria-label={`${value.toFixed(1)} su 5 stelle`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const portion = Math.min(1, Math.max(0, v - i));
        return <StarCell key={i} portion={portion} size={size} />;
      })}
    </div>
  );
}
