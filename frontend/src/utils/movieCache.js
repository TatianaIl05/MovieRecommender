export async function getMoviesByIds(ids, movieCache, setMovieCache) {
  const movieIds = [...new Set(ids.map((id) => Number(id)).filter(Boolean))]
  if (movieIds.length === 0) return []

  const cachedMovies = new Map(movieCache)
  const missingIds = movieIds.filter((id) => !cachedMovies.has(id))

  if (missingIds.length > 0) {
    const res = await fetch('/api/movies/by-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: missingIds })
    })

    if (!res.ok) {
      throw new Error('Failed to load movie details')
    }

    const loadedMovies = await res.json()
    loadedMovies.forEach((movie) => cachedMovies.set(Number(movie.id), movie))
    setMovieCache(cachedMovies)
  }

  return movieIds.map((id) => cachedMovies.get(id)).filter(Boolean)
}
