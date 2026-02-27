from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
from typing import List
import logging

from db import get_db, engine
from models import Recommendation, UserRecommendations, SimilarMoviesRequest, UserBasedRequest
from recommender import HybridRecommender

app = FastAPI(title="Movie Recommender Service")

# Глобальный объект рекомендаций (загружается один раз)
recommender = HybridRecommender()
logger = logging.getLogger(__name__)

@app.on_event("startup")
def load_data():
    try:
        # Читаем таблицы один раз при старте сервиса
        movies = pd.read_sql("SELECT movie_id, title, genres FROM movies", engine)
        ratings = pd.read_sql("SELECT user_id, movie_id, rating FROM ratings", engine)
        
        recommender.load_data(movies, ratings)
        logger.info("Данные успешно загружены в рекомендатель")
    except Exception as e:
        logger.error(f"Ошибка загрузки данных: {e}")
        raise e

@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": recommender.is_fitted}

@app.post("/recommend/similar", response_model=List[Recommendation])
def get_similar_movies(request: SimilarMoviesRequest):
    recs = recommender.get_content_recommendations(request.movie_id, request.limit)
    if not recs:
        raise HTTPException(404, "Фильм не найден или недостаточно данных")
    
    # Обогащаем названием и жанрами
    result = []
    for r in recs:
        movie = recommender.movies_df[recommender.movies_df['movie_id'] == r['movie_id']].iloc[0]
        result.append({
            "movie_id": r['movie_id'],
            "title": movie['title'],
            "genres": movie['genres'],
            "score": r['score']
        })
    return result

@app.post("/recommend/user", response_model=UserRecommendations)
def get_user_recommendations(request: UserBasedRequest):
    hybrid_recs = recommender.hybrid_recommend(
        user_id=request.user_id,
        n=request.limit,
        content_weight=0.35,   # можно настраивать
        user_weight=0.65
    )
    
    if not hybrid_recs:
        raise HTTPException(404, "Нет рекомендаций для пользователя")
    
    result = []
    for r in hybrid_recs:
        movie = recommender.movies_df[recommender.movies_df['movie_id'] == r['movie_id']].iloc[0]
        result.append({
            "movie_id": r['movie_id'],
            "title": movie['title'],
            "genres": movie['genres'],
            "score": r['score']
        })
    
    return {
        "user_id": request.user_id,
        "recommendations": result
    }

# Для отладки
@app.get("/movies/count")
def get_movies_count():
    return {"count": len(recommender.movies_df) if recommender.movies_df is not None else 0}