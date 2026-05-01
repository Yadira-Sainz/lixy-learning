import { cn } from "@/lib/utils";

/** Ilustración inline para tarjeta Memes (sin petición HTTP; evita 404 en standalone). */
export function MemesCategoryCoverArt({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 450"
      preserveAspectRatio="xMidYMid slice"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <rect width="800" height="450" fill="#fafafa" />
      <path
        fill="#fff"
        stroke="#18181b"
        strokeWidth="10"
        strokeLinejoin="round"
        d="M360 310c0-40 20-70 40-80s50-10 80 0 40 40 40 80v40H360z"
      />
      <path
        fill="#fff"
        stroke="#18181b"
        strokeWidth="10"
        strokeLinejoin="round"
        d="M400 120c-52 0-95 38-95 88 0 28 12 52 32 68 8 6 18 10 28 12 10 2 21 3 35 3s25-1 35-3c10-2 20-6 28-12 20-16 32-40 32-68 0-50-43-88-95-88z"
      />
      <circle cx="365" cy="175" r="34" fill="none" stroke="#18181b" strokeWidth="8" />
      <circle cx="435" cy="175" r="34" fill="none" stroke="#18181b" strokeWidth="8" />
      <path fill="none" stroke="#18181b" strokeWidth="8" strokeLinecap="round" d="M399 175h2" />
      <circle cx="365" cy="175" r="6" fill="#18181b" />
      <circle cx="435" cy="175" r="6" fill="#18181b" />
      <path
        fill="none"
        stroke="#18181b"
        strokeWidth="8"
        strokeLinecap="round"
        d="M370 230c20 18 40 18 60 0"
      />
      <path
        fill="none"
        stroke="#18181b"
        strokeWidth="9"
        strokeLinecap="round"
        d="M330 280c-30 20-50 50-45 75M470 280c30 20 50 50 45 75"
      />
      <rect
        x="500"
        y="165"
        width="200"
        height="130"
        rx="14"
        fill="#fff"
        stroke="#18181b"
        strokeWidth="10"
      />
      <path
        fill="none"
        stroke="#18181b"
        strokeWidth="7"
        strokeLinecap="round"
        d="M530 210h140M530 245h100M530 280h120"
      />
      <path
        fill="none"
        stroke="#18181b"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.35"
        d="M120 100l28-8M148 140l-30-6M100 160l32 4"
      />
    </svg>
  );
}
