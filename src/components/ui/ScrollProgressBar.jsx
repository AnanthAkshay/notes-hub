import { useEffect, useRef } from 'react'

export default function ScrollProgressBar() {
  const barRef = useRef(null)

  useEffect(() => {
    let rafId = null

    const updateProgress = () => {
      rafId = null
      const el = barRef.current
      if (!el) return
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const ratio = docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0
      el.style.transform = `scaleX(${ratio})`
    }

    const onScroll = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(updateProgress)
    }

    updateProgress()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2px] z-50 pointer-events-none bg-transparent"
      aria-hidden="true"
      data-no-print
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-[var(--accent-primary)] transition-opacity duration-150"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  )
}

