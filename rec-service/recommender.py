import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class HybridRecommender:
    def __init__(self):
        self.movies_df: pd.DataFrame = None
        self.ratings_pivot: pd.DataFrame = None
        self.movie_similarity: np.ndarray = None      # content-based (по жанрам)
        self.user_item_matrix: csr_matrix = None      # для user-based
        self.item_user_matrix: csr_matrix = None
        self.movie_id_to_idx: Dict[int, int] = {}
        self.idx_to_movie_id: Dict[int, int] = {}
        self.is_fitted = False

    def load_data(self, movies_df: pd.DataFrame, ratings_df: pd.DataFrame):
        """Загружаем данные один раз при старте"""
        self.movies_df = movies_df.copy()
        
        # Content-based: TF-IDF по жанрам
        tfidf = TfidfVectorizer(stop_words='english')
        genre_matrix = tfidf.fit_transform(self.movies_df['genres'].fillna(''))
        self.movie_similarity = cosine_similarity(genre_matrix)
        
        # User-based / Item-based подготовка
        self.ratings_pivot = ratings_df.pivot(
            index='user_id',
            columns='movie_id',
            values='rating'
        ).fillna(0)
        
        # Для быстрого маппинга movie_id ↔ индекс столбца
        movie_ids = list(self.ratings_pivot.columns)
        self.movie_id_to_idx = {mid: i for i, mid in enumerate(movie_ids)}
        self.idx_to_movie_id = {i: mid for mid, i in self.movie_id_to_idx.items()}
        
        # Матрица item-user (строки — фильмы, столбцы — пользователи)
        self.item_user_matrix = csr_matrix(self.ratings_pivot.T.values)
        
        logger.info(f"Загружено {len(self.movies_df)} фильмов и {len(ratings_df)} оценок")
        self.is_fitted = True

    def get_content_recommendations(self, movie_id: int, n: int = 10) -> List[Dict]:
        if not self.is_fitted:
            return []
        if movie_id not in self.movie_id_to_idx:
            return []
        
        idx = self.movies_df[self.movies_df['movie_id'] == movie_id].index[0]
        sim_scores = list(enumerate(self.movie_similarity[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        
        top = []
        for i, score in sim_scores[1:n+1]:  # пропускаем сам фильм
            m_id = self.movies_df.iloc[i]['movie_id']
            top.append({
                'movie_id': int(m_id),
                'score': float(score)
            })
        return top

    def get_user_recommendations(self, user_id: int, n: int = 10) -> List[Dict]:
        if not self.is_fitted or user_id not in self.ratings_pivot.index:
            return []
        
        user_idx = self.ratings_pivot.index.get_loc(user_id)
        user_ratings = self.ratings_pivot.iloc[user_idx].values
        
        # Простая user-based: взвешенная сумма оценок похожих пользователей
        # (можно улучшить → KNN или SVD, но для начала оставим просто)
        
        # Считаем сходство пользователей (cosine на user×item матрице)
        user_sim = cosine_similarity(
            self.ratings_pivot.values[user_idx].reshape(1, -1),
            self.ratings_pivot.values
        )[0]
        
        # Топ-50 похожих пользователей (кроме себя)
        sim_users_idx = np.argsort(user_sim)[::-1][1:51]
        sim_scores = user_sim[sim_users_idx]
        
        # Предсказанные рейтинги
        pred_ratings = np.zeros(len(self.ratings_pivot.columns))
        weights_sum = np.zeros(len(self.ratings_pivot.columns))
        
        for i, sim in zip(sim_users_idx, sim_scores):
            if sim <= 0:
                continue
            ratings = self.ratings_pivot.iloc[i].values
            mask = ratings > 0
            pred_ratings[mask] += sim * ratings[mask]
            weights_sum[mask] += sim
        
        pred_ratings = np.divide(pred_ratings, weights_sum, where=weights_sum != 0)
        
        # Фильмы, которые пользователь ещё не смотрел
        unseen_mask = user_ratings == 0
        pred_ratings[~unseen_mask] = -1  # чтобы не рекомендовали уже просмотренные
        
        top_idx = np.argsort(pred_ratings)[::-1][:n]
        top_movies = []
        for idx in top_idx:
            if pred_ratings[idx] <= 0:
                break
            m_id = self.ratings_pivot.columns[idx]
            top_movies.append({
                'movie_id': int(m_id),
                'score': float(pred_ratings[idx])
            })
        
        return top_movies

    def hybrid_recommend(self, user_id: int, movie_id: Optional[int] = None, n: int = 10,
                        content_weight: float = 0.4, user_weight: float = 0.6) -> List[Dict]:
        """Гибрид: content-based + user-based"""
        content_recs = {}
        if movie_id:
            content_list = self.get_content_recommendations(movie_id, n * 2)
            for item in content_list:
                content_recs[item['movie_id']] = item['score']

        user_recs = {}
        user_list = self.get_user_recommendations(user_id, n * 2)
        for item in user_list:
            user_recs[item['movie_id']] = item['score']

        # Собираем все уникальные фильмы
        all_movie_ids = set(content_recs.keys()) | set(user_recs.keys())
        
        hybrid_scores = {}
        for m_id in all_movie_ids:
            c_score = content_recs.get(m_id, 0)
            u_score = user_recs.get(m_id, 0)
            # Нормализация score (примерно в 0..1)
            hybrid = (content_weight * c_score + user_weight * u_score)
            hybrid_scores[m_id] = hybrid

        # Сортируем и берём топ
        sorted_movies = sorted(hybrid_scores.items(), key=lambda x: x[1], reverse=True)[:n]
        
        return [{'movie_id': mid, 'score': score} for mid, score in sorted_movies]