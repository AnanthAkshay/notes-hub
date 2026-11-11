import { useState, useRef, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import Button from './Button'

export default function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  size = 'sm',
  variant = 'outline',
  className = '',
}) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopy = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!text) return

    try {
      await navigator.clipboard.writeText(String(text))
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      // Fallback for restricted clipboard contexts
      const textarea = document.createElement('textarea')
      textarea.value = String(text)
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setCopied(false), 1800)
      } finally {
        document.body.removeChild(textarea)
      }
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={className}
      aria-live="polite"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-[var(--accent-verified)]" />
          <span>{copiedLabel}</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>{label}</span>
        </>
      )}
    </Button>
  )
}

