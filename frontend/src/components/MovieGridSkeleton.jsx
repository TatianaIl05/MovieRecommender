function MovieGridSkeleton({ count = 12 }) {
  return (
    <div className="movies-grid movies-grid--skeleton" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="movie-card movie-card--skeleton" key={index}>
          <div className="movie-card__poster movie-card__poster--skeleton" />
          <div className="movie-card__title movie-card__title--skeleton" />
        </div>
      ))}
    </div>
  )
}

export default MovieGridSkeleton
