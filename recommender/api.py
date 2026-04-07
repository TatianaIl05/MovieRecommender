# ==================== api.py ====================
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from recommender import Recommender
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

recommender: Recommender | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Запускается при старте и остановке сервера"""
    global recommender
    try:
        logger.info("Загрузка Recommender...")
        recommender = Recommender()
        app.state.rec = recommender
        logger.info("Recommender успешно загружен и готов к работе!")
    except Exception as e:
        logger.error(f"Критическая ошибка при загрузке Recommender: {e}")
        raise
    yield
    logger.info("Сервер завершает работу")


app = FastAPI(lifespan=lifespan, title="Movie Recommender API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TmdbIdsRequest(BaseModel):
    tmdb_ids: list[int]
    k: int = 10
    alpha: float = 0.75


class MultiMovieRequest(BaseModel):
    movies: list[str]
    k: int = 10
    alpha: float = 0.75


def get_recommender(request: Request) -> Recommender:
    """Безопасное получение рекомендатора"""
    if hasattr(request.app.state, "rec") and request.app.state.rec is not None:
        return request.app.state.rec
    if recommender is not None:
        return recommender
    raise RuntimeError("Recommender не инициализирован")


@app.post("/api/recommend")
def recommend_by_ids(request: TmdbIdsRequest, req: Request):
    """Рекомендации по списку tmdb_id"""
    rec = get_recommender(req)
    res = rec.get_recommendations_by_tmdb_ids(request.tmdb_ids, request.k, request.alpha)

    if not res:
        return {"error": "No recommendations found for the given tmdb_ids"}
    return {"recommendations": res}


@app.post("/api/recommend/by-title")
def recommend_by_titles(request: MultiMovieRequest, req: Request):
    """Рекомендации по списку названий фильмов"""
    rec = get_recommender(req)
    res = rec.get_k_movies_multi(request.movies, request.k, request.alpha)

    if not res:
        return {"error": "No recommendations found for the given titles"}
    return {"recommendations": res}


@app.get("/health")
def health():
    """Проверка состояния сервера"""
    loaded = recommender is not None
    return {
        "status": "healthy",
        "recommender_loaded": loaded,
        "message": "OK" if loaded else "Recommender still loading or failed"
    }