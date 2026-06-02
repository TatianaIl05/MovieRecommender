import { useEffect, useRef } from 'react'

function LoadMoreSentinel({ enabled, loading, onLoadMore }) {
  const sentinelRef = useRef(null)

  useEffect(() => {
    if (!enabled || loading || !sentinelRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore()
        }
      },
      { rootMargin: '700px 0px' }
    )

    observer.observe(sentinelRef.current)

    return () => observer.disconnect()
  }, [enabled, loading, onLoadMore])

  return <div className="load-more-sentinel" ref={sentinelRef} aria-hidden="true" />
}

export default LoadMoreSentinel
