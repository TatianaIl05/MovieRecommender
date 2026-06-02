# ==================== recommender.py ====================
import time
import logging
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pathlib import Path
from typing import List, Dict

logger = logging.getLogger(__name__)


class Recommender:
    def __init__(self):
        base = Path(__file__).resolve().parent
        self.tmdb_path = base / 'movies.csv'
        self.target_cols_path = base / 'tfidf.csv'

        if not self.tmdb_path.exists():
            raise FileNotFoundError(f"Не найден датасет TMDB: {self.tmdb_path}")
        if not self.target_cols_path.exists():
            raise FileNotFoundError(f"Не найден tfidf.csv: {self.target_cols_path}")


        print("Загрузка TMDB датасета...")
        self.tmdb = pd.read_csv(self.tmdb_path, low_memory=False)

        print("Загрузка tfidf.csv...")
        self.target_cols = pd.read_csv(self.target_cols_path, index_col=0)
        self.text_data = self.target_cols.iloc[:, 0].fillna('')

        print("Создание TF-IDF матрицы...")
        vectorizer = TfidfVectorizer(
            min_df=1,
            max_df=1.0,
            max_features=20000,
            ngram_range=(1, 2),
            stop_words='english',
            analyzer='word',
            dtype=np.float32,
            norm='l2',
            use_idf=True,
            smooth_idf=True,
            sublinear_tf=False
        )

        self.tfidf_matrix = vectorizer.fit_transform(self.text_data)

        self.tmdb = self.tmdb.set_index('id', verify_integrity=False)

        self.tmdb.index = self.tmdb.index.astype(int)


    def get_recommendations_by_tmdb_ids(self, tmdb_ids: List[int], k: int = 10, alpha: float = 0.75) -> List[Dict]:
        """
        Принимает список tmdb_id.
        Возвращает k рекомендаций в виде списка словарей для JSON.
        """
        start = time.perf_counter()
        if not tmdb_ids:
            return []

        valid_ids = [tid for tid in tmdb_ids if tid in self.tmdb.index]
        if not valid_ids:
            return []

        t1 = time.perf_counter()
        pos_indices = [self.tmdb.index.get_loc(tid) for tid in valid_ids]

        # Средний TF-IDF вектор
        query_vector = self.tfidf_matrix[pos_indices].mean(axis=0)
        query_vector = np.asarray(query_vector)
        if query_vector.ndim == 1:
            query_vector = query_vector.reshape(1, -1)

        t2 = time.perf_counter()
        sim_scores = cosine_similarity(query_vector, self.tfidf_matrix).flatten()

        t3 = time.perf_counter()
        exclude_set = set(pos_indices)

        # Векторизованная сортировка через argsort — вместо Python-цикла
        popularity = self.tmdb['popularity_norm'].values.astype(np.float32)
        final_scores = (sim_scores * alpha) + (popularity * (1 - alpha))

        # Маска для исключения входных фильмов
        mask = np.ones(len(final_scores), dtype=bool)
        mask[list(exclude_set)] = False

        # Топ-k индексы
        top_k = np.argsort(final_scores * mask)[::-1][:k]

        # Быстрая сборка результата через numpy-индексацию
        result_tmdb_ids = self.tmdb.index.values[top_k]
        result_titles = self.tmdb['title'].values[top_k]

        result = [
            {
                "tmdb_id": int(result_tmdb_ids[i]),
                "title": str(result_titles[i]),
            }
            for i in range(len(top_k))
        ]

        t4 = time.perf_counter()
        total = time.perf_counter() - start
        logger.info(
            f"get_recommendations_by_tmdb_ids: total={total:.3f}s "
            f"(validation={t1-start:.3f}s, vector={t2-t1:.3f}s, "
            f"similarity={t3-t2:.3f}s, scoring={t4-t3:.3f}s, "
            f"result_build={t4-t3:.3f}s) "
            f"ids={len(tmdb_ids)} valid={len(valid_ids)} k={k} alpha={alpha}"
        )
        return result


    def get_k_movies_multi(self, titles: List[str], k: int = 10, alpha=0.75) -> List[Dict]:
        """Обёртка: ищет tmdb_id по названиям и делегирует."""
        tmdb_ids = []
        for title in titles:
            match = self.tmdb[self.tmdb['title'].str.contains(title, case=False, na=False)]
            if len(match) > 0:
                tmdb_ids.append(int(match.iloc[0]['id']))

        if not tmdb_ids:
            return []

        return self.get_recommendations_by_tmdb_ids(tmdb_ids, k, alpha)
