import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let rafId = null
    const checkScroll = () => {
      rafId = null
      setVisible(window.scrollY > 360)
    }
    const onScroll = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(checkScroll)
    }
    checkScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
  }, [])

  const scrollToTop = () => {
    const prefersReduced =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({
      top: 0,
      behavior: prefersReduced ? 'auto' : 'smooth',
    })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      data-no-print
      className={`fixed bottom-20 right-5 z-40 inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-ink)] text-xs font-mono-meta font-medium transition-all duration-150 cursor-pointer hover:bg-[var(--bg-surface)] active:scale-[0.97] ${
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Top</span>
    </button>
  )
}

