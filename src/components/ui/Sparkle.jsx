// 4-point decorative star sparkle matching the reference hero design
export default function Sparkle({ className = '', size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 104 104"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <path
        d="M52 0C52 28.7188 75.2812 52 104 52C75.2812 52 52 75.2812 52 104C52 75.2812 28.7188 52 0 52C28.7188 52 52 28.7188 52 0Z"
        fill="currentColor"
      />
    </svg>
  )
}
