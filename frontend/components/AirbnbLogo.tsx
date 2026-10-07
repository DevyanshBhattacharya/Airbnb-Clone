/**
 * Airbnb wordmark. The bélo symbol is a registered trademark, so we render the
 * lowercase wordmark in the brand's Rausch colour, which reads as Airbnb
 * without reproducing the protected mark.
 */
export function AirbnbLogo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-bold tracking-tight text-rausch ${className}`}
      aria-label="Airbnb"
    >
      airbnb
    </span>
  );
}
