import { useEffect, useRef, useState } from 'react'
import MovieCard from './MovieCard'

function getGridSettings(width) {
  if (width <= 480) return { columns: 2, gap: 12 }

  const minCardWidth = width <= 768 ? 140 : 180
  const gap = width <= 768 ? 16 : 24
  const columns = Math.max(1, Math.floor((width + gap) / (minCardWidth + gap)))

  return { columns, gap }
}

function VirtualMovieGrid({
  movies,
  onMovieClick,
  compareMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  overscanRows = 3
}) {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [viewport, setViewport] = useState({ top: 0, height: window.innerHeight })

  useEffect(() => {
    if (!containerRef.current) return

    const updateWidth = () => setContainerWidth(containerRef.current?.clientWidth || 0)
    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ top: window.scrollY, height: window.innerHeight })
    }

    updateViewport()
    window.addEventListener('scroll', updateViewport, { passive: true })
    window.addEventListener('resize', updateViewport)

    return () => {
      window.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
    }
  }, [])

  if (!movies.length) {
    return <div ref={containerRef} className="virtual-movies-grid" />
  }

  const { columns, gap } = getGridSettings(containerWidth || 1200)
  const cardWidth = containerWidth > 0 ? (containerWidth - gap * (columns - 1)) / columns : 180
  const rowHeight = cardWidth * 1.5 + 48 + gap
  const totalRows = Math.ceil(movies.length / columns)
  const totalHeight = Math.max(0, totalRows * rowHeight - gap)
  const containerTop = containerRef.current?.getBoundingClientRect().top + window.scrollY || 0
  const visibleTop = Math.max(0, viewport.top - containerTop)
  const visibleBottom = visibleTop + viewport.height
  const startRow = Math.max(0, Math.floor(visibleTop / rowHeight) - overscanRows)
  const endRow = Math.min(totalRows, Math.ceil(visibleBottom / rowHeight) + overscanRows)
  const startIndex = startRow * columns
  const endIndex = Math.min(movies.length, endRow * columns)
  const visibleMovies = movies.slice(startIndex, endIndex)
  const translateY = startRow * rowHeight

  return (
    <div ref={containerRef} className="virtual-movies-grid" style={{ height: totalHeight }}>
      <div className="virtual-movies-grid__window" style={{ transform: `translateY(${translateY}px)` }}>
        <div className="movies-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap }}>
          {visibleMovies.map((movie) => {
            const isSelected = selectedIds.has(movie.id)
            return (
              <div className={`virtual-movies-grid__item ${isSelected ? 'virtual-movies-grid__item--selected' : ''}`} key={movie.id}>
                {compareMode && (
                  <button
                    type="button"
                    className="compare-select"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleSelect(movie)
                    }}
                    aria-pressed={isSelected}
                  >
                    {isSelected ? 'Selected' : 'Compare'}
                  </button>
                )}
                <MovieCard movie={movie} onClick={() => compareMode ? onToggleSelect(movie) : onMovieClick(movie)} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default VirtualMovieGrid
