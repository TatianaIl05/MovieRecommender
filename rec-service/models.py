from pydantic import BaseModel
from typing import List, Optional

class MovieBase(BaseModel):
    movie_id: int
    title: str
    genres: str

class Movie(MovieBase):
    class Config:
        from_attributes = True

class Recommendation(BaseModel):
    movie_id: int
    title: str
    genres: str
    score: float

class UserRecommendations(BaseModel):
    user_id: int
    recommendations: List[Recommendation]

class SimilarMoviesRequest(BaseModel):
    movie_id: int
    limit: int = 10

class UserBasedRequest(BaseModel):
    user_id: int
    limit: int = 10