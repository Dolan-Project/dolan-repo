export function DolanWordmark({
  className = "",
  height = 36,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <span className={`inline-flex overflow-hidden ${className}`} style={{ height, width: height * 2.55 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="DOLAN"
        src="/brand/dolan-wordmark.png"
        className="h-[220%] w-[220%] max-w-none origin-center object-cover mix-blend-multiply"
        style={{ marginTop: "-38%", marginLeft: "-22%" }}
      />
    </span>
  );
}
