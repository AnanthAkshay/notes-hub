export function BrandSealIcon({ className = 'w-5 h-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 4h11l5 5v11H4V4z" />
      <path d="M15 4v5h5" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  )
}

export function VerifiedSealIcon({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      <polygon points="10,1.5 12.6,3.4 15.8,3.2 16.6,6.3 18.8,8.7 17.6,11.7 18.2,14.9 15.1,15.8 13.3,18.4 10,17.4 6.7,18.4 4.9,15.8 1.8,14.9 2.4,11.7 1.2,8.7 3.4,6.3 4.2,3.2 7.4,3.4" />
      <path d="M6.8 10.3l2.1 2.1 4.4-4.5" />
    </svg>
  )
}

export function CatalogDocIcon({ className = 'w-5 h-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h4" />
    </svg>
  )
}

export function UpvoteGlyph({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 3v10" />
      <path d="M3.5 7.5L8 3l4.5 4.5" />
    </svg>
  )
}

export function DownvoteGlyph({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 13V3" />
      <path d="M3.5 8.5L8 13l4.5-4.5" />
    </svg>
  )
}

export function SunGlyph({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M15.8 4.2l-1.4 1.4M5.6 14.4l-1.4 1.4" />
    </svg>
  )
}

export function MoonGlyph({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <path d="M16.5 12.6A6.8 6.8 0 0 1 7.4 3.5a7 7 0 1 0 9.1 9.1z" />
    </svg>
  )
}

export function EyeOpenGlyph({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.8 10s3-5.2 8.2-5.2S18.2 10 18.2 10s-3 5.2-8.2 5.2S1.8 10 1.8 10z" />
      <circle cx="10" cy="10" r="2.3" />
    </svg>
  )
}

export function EyeClosedGlyph({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 2.5l15 15" />
      <path d="M8.2 5a8.7 8.7 0 0 1 1.8-.2c5.2 0 8.2 5.2 8.2 5.2a14.4 14.4 0 0 1-2.5 3.1" />
      <path d="M5.4 6.7A13.8 13.8 0 0 0 1.8 10s3 5.2 8.2 5.2c1.2 0 2.3-.3 3.3-.7" />
    </svg>
  )
}

