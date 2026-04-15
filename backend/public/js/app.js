/* ===== App State ===== */
const state = {
    user: null,
    moviesOffset: 0,
    moviesLimit: 20,
    currentMovieId: null,
    favorites: new Set(),
    watchLater: new Set(),
};

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const RECOMMENDER_URL = 'http://localhost:8000';

/* ===== DOM Elements ===== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const pages = {
    home: $('#page-home'),
    auth: $('#page-auth'),
    profile: $('#page-profile'),
    recommend: $('#page-recommend'),
    watchlater: $('#page-watchlater'),
};

/* ===== Utility ===== */
function showPage(name) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    if (pages[name]) pages[name].classList.add('active');
}

function showMessage(el, text, type = 'error') {
    el.textContent = text;
    el.className = `form-message ${type}`;
    setTimeout(() => { el.className = 'form-message'; }, 5000);
}

function updateAuthUI() {
    const authLink = $('.nav__link--auth');
    const userLink = $('.nav__link--user');
    const logoutBtn = $('#logoutBtn');

    if (state.user) {
        authLink.classList.add('hidden');
        userLink.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        userLink.textContent = state.user.login;
    } else {
        authLink.classList.remove('hidden');
        userLink.classList.add('hidden');
        logoutBtn.classList.add('hidden');
    }
}

function getPosterUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${TMDB_IMG_BASE}${path}`;
}

/* ===== Routing ===== */
$$('[data-route]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.dataset.route;

        // Guard: profile and watchlater require auth
        if ((route === 'profile' || route === 'watchlater') && !state.user) {
            showPage('auth');
            return;
        }

        showPage(route);

        if (route === 'profile' && state.user) {
            loadFavorites();
        }
        if (route === 'watchlater' && state.user) {
            loadWatchLater();
        }
    });
});

/* ===== Auth: Tabs ===== */
$$('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        $$('.auth-tab').forEach(t => t.classList.remove('active'));
        $$('.auth-form').forEach(f => f.classList.remove('active'));

        tab.classList.add('active');
        const target = tab.dataset.tab;
        $(`#${target}Form`).classList.add('active');
    });
});

/* ===== Auth: Register ===== */
$('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = $('#registerMessage');

    const login = $('#regLogin').value.trim();
    const email = $('#regEmail').value.trim();
    const password = $('#regPassword').value;
    const passwordConfirm = $('#regPasswordConfirm').value;

    if (password !== passwordConfirm) {
        return showMessage(msgEl, 'Пароли не совпадают', 'error');
    }

    if (password.length < 6) {
        return showMessage(msgEl, 'Пароль должен быть не менее 6 символов', 'error');
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, email, password }),
        });

        const data = await res.json();

        if (res.ok) {
            showMessage(msgEl, 'Регистрация успешна! Теперь войдите.', 'success');
            $('#registerForm').reset();
            // Switch to login tab
            $$('.auth-tab')[0].click();
        } else {
            showMessage(msgEl, data.error || 'Ошибка регистрации', 'error');
        }
    } catch (err) {
        showMessage(msgEl, 'Ошибка сети', 'error');
    }
});

/* ===== Auth: Login ===== */
$('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = $('#loginMessage');

    const login = $('#loginLogin').value.trim();
    const password = $('#loginPassword').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password }),
        });

        const data = await res.json();

        if (res.ok) {
            state.user = data.user;
            updateAuthUI();
            showPage('home');
            $('#loginForm').reset();
        } else {
            showMessage(msgEl, data.error || 'Ошибка входа', 'error');
        }
    } catch (err) {
        showMessage(msgEl, 'Ошибка сети', 'error');
    }
});

/* ===== Auth: Logout ===== */
$('#logoutBtn').addEventListener('click', () => {
    state.user = null;
    state.favorites.clear();
    state.watchLater.clear();
    updateAuthUI();
    showPage('home');
});

/* ===== Movies: Load Grid ===== */
async function loadMovies() {
    const grid = $('#moviesGrid');
    const loadMoreBtn = $('#loadMoreBtn');

    try {
        const res = await fetch(`/api/movies?limit=${state.moviesLimit}&offset=${state.moviesOffset}`);
        const data = await res.json();

        if (data.movies && data.movies.length > 0) {
            // Fetch poster for each movie
            for (const movie of data.movies) {
                const card = createMovieCard(movie);
                grid.appendChild(card);

                // Load poster asynchronously
                loadMoviePoster(movie, card);
            }

            state.moviesOffset += data.movies.length;
            loadMoreBtn.style.display = data.movies.length >= state.moviesLimit ? 'inline-flex' : 'none';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    } catch (err) {
        console.error('Ошибка загрузки фильмов:', err);
    }
}

async function loadMoviePoster(movie, card) {
    try {
        const res = await fetch(`/api/movies/${movie.id}`);
        if (!res.ok) return;

        const detail = await res.json();
        if (detail.poster_path) {
            const img = card.querySelector('.movie-card__poster');
            img.src = getPosterUrl(detail.poster_path);
            img.alt = movie.title;
            img.classList.remove('movie-card__poster--placeholder');
        }

        // Store detail for modal
        card.dataset.movieId = movie.id;
        card._movieDetail = detail;
    } catch (err) {
        console.error(`Ошибка загрузки постера для ${movie.id}:`, err);
    }
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
        <img class="movie-card__poster movie-card__poster--placeholder" src="" alt="">
        <div class="movie-card__title">${movie.title || 'Без названия'}</div>
    `;

    card.addEventListener('click', () => openMovieModal(card._movieDetail || { id: movie.id, title: movie.title }));
    return card;
}

$('#loadMoreBtn').addEventListener('click', loadMovies);

/* ===== Movie Modal ===== */
function openMovieModal(detail) {
    state.currentMovieId = detail.id;

    $('#modalTitle').textContent = detail.title || 'Без названия';
    $('#modalDate').textContent = detail.release_date || '';
    $('#modalRating').textContent = detail.vote_average ? `★ ${Number(detail.vote_average).toFixed(1)}` : '';
    $('#modalGenres').textContent = detail.genres || '';
    $('#modalOverview').textContent = detail.overview || 'Описание отсутствует';

    const posterEl = $('#modalPoster');
    if (detail.poster_path) {
        posterEl.src = getPosterUrl(detail.poster_path);
        posterEl.style.display = 'block';
    } else {
        posterEl.style.display = 'none';
    }

    // Update favorites button state
    updateFavoritesButton();
    updateWatchLaterButton();

    $('#movieModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeMovieModal() {
    $('#movieModal').classList.add('hidden');
    document.body.style.overflow = '';
    state.currentMovieId = null;
}

$('#modalClose').addEventListener('click', closeMovieModal);
$('#movieModal').addEventListener('click', (e) => {
    if (e.target === $('#movieModal')) closeMovieModal();
});

function updateFavoritesButton() {
    const btn = $('#addToFavoritesBtn');
    if (state.favorites.has(state.currentMovieId)) {
        btn.textContent = 'В избранном';
        btn.disabled = true;
    } else {
        btn.textContent = 'Добавить в избранное';
        btn.disabled = false;
    }
}

function updateWatchLaterButton() {
    const btn = $('#addToWatchLaterBtn');
    if (state.watchLater.has(state.currentMovieId)) {
        btn.textContent = 'В списке';
        btn.disabled = true;
    } else {
        btn.textContent = 'Смотреть позже';
        btn.disabled = false;
    }
}

/* ===== Add to Favorites ===== */
$('#addToFavoritesBtn').addEventListener('click', async () => {
    if (!state.user || !state.currentMovieId) return;

    try {
        const res = await fetch(`/api/favorites/${state.user.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movies: [{ movie_id: state.currentMovieId }] }),
        });

        if (res.ok) {
            state.favorites.add(state.currentMovieId);
            updateFavoritesButton();
        }
    } catch (err) {
        console.error('Ошибка добавления в избранное:', err);
    }
});

/* ===== Add to Watch Later ===== */
$('#addToWatchLaterBtn').addEventListener('click', async () => {
    if (!state.user || !state.currentMovieId) return;

    try {
        const res = await fetch(`/api/watch-later/${state.user.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movies: [{ movie_id: state.currentMovieId }] }),
        });

        if (res.ok) {
            state.watchLater.add(state.currentMovieId);
            updateWatchLaterButton();
        }
    } catch (err) {
        console.error('Ошибка добавления в список "Смотреть позже":', err);
    }
});

/* ===== Load Favorites ===== */
async function loadFavorites() {
    if (!state.user) return;

    const grid = $('#favoritesGrid');
    const emptyEl = $('#favoritesEmpty');
    grid.innerHTML = '';

    try {
        const res = await fetch(`/api/favorites/${state.user.id}`);
        const data = await res.json();

        if (data.favorite_movies && data.favorite_movies.length > 0) {
            emptyEl.classList.add('hidden');

            for (const movieId of data.favorite_movies) {
                try {
                    const detailRes = await fetch(`/api/movies/${movieId}`);
                    if (!detailRes.ok) continue;

                    const detail = await detailRes.json();
                    state.favorites.add(movieId);
                    const card = createFavoriteCard(detail);
                    grid.appendChild(card);
                } catch (err) {
                    console.error(`Ошибка загрузки фильма ${movieId}:`, err);
                }
            }
        } else {
            emptyEl.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Ошибка загрузки избранного:', err);
    }
}

function createFavoriteCard(detail) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
        <img class="movie-card__poster" src="" alt="">
        <div class="movie-card__title">${detail.title || 'Без названия'}</div>
        <button class="movie-card__remove" data-remove-fav="${detail.id}">&times;</button>
    `;

    if (detail.poster_path) {
        const img = card.querySelector('.movie-card__poster');
        img.src = getPosterUrl(detail.poster_path);
        img.alt = detail.title;
    }

    card.addEventListener('click', (e) => {
        if (e.target.classList.contains('movie-card__remove')) return;
        openMovieModal(detail);
    });

    card.querySelector('.movie-card__remove').addEventListener('click', async (e) => {
        e.stopPropagation();
        await removeFromFavorites(detail.id);
        card.remove();
        const grid = $('#favoritesGrid');
        if (grid.children.length === 0) {
            $('#favoritesEmpty').classList.remove('hidden');
        }
    });

    return card;
}

/* ===== Remove from Favorites ===== */
async function removeFromFavorites(movieId) {
    if (!state.user) return;

    try {
        const res = await fetch(`/api/favorites/${state.user.id}/${movieId}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            state.favorites.delete(movieId);
        }
    } catch (err) {
        console.error('Ошибка удаления из избранного:', err);
    }
}

/* ===== Load Watch Later ===== */
async function loadWatchLater() {
    if (!state.user) return;

    const grid = $('#watchLaterGrid');
    const emptyEl = $('#watchLaterEmpty');
    grid.innerHTML = '';

    try {
        const res = await fetch(`/api/watch-later/${state.user.id}`);
        const data = await res.json();

        if (data.favorite_movies && data.favorite_movies.length > 0) {
            emptyEl.classList.add('hidden');

            for (const movieId of data.favorite_movies) {
                try {
                    const detailRes = await fetch(`/api/movies/${movieId}`);
                    if (!detailRes.ok) continue;

                    const detail = await detailRes.json();
                    state.watchLater.add(movieId);
                    const card = createWatchLaterCard(detail);
                    grid.appendChild(card);
                } catch (err) {
                    console.error(`Ошибка загрузки фильма ${movieId}:`, err);
                }
            }
        } else {
            emptyEl.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Ошибка загрузки списка "Смотреть позже":', err);
    }
}

function createWatchLaterCard(detail) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
        <img class="movie-card__poster" src="" alt="">
        <div class="movie-card__title">${detail.title || 'Без названия'}</div>
        <button class="movie-card__remove" data-remove-watch="${detail.id}">&times;</button>
    `;

    if (detail.poster_path) {
        const img = card.querySelector('.movie-card__poster');
        img.src = getPosterUrl(detail.poster_path);
        img.alt = detail.title;
    }

    card.addEventListener('click', (e) => {
        if (e.target.classList.contains('movie-card__remove')) return;
        openMovieModal(detail);
    });

    card.querySelector('.movie-card__remove').addEventListener('click', async (e) => {
        e.stopPropagation();
        await removeFromWatchLater(detail.id);
        card.remove();
        const grid = $('#watchLaterGrid');
        if (grid.children.length === 0) {
            $('#watchLaterEmpty').classList.remove('hidden');
        }
    });

    return card;
}

/* ===== Remove from Watch Later ===== */
async function removeFromWatchLater(movieId) {
    if (!state.user) return;

    try {
        const res = await fetch(`/api/watch-later/${state.user.id}/${movieId}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            state.watchLater.delete(movieId);
        }
    } catch (err) {
        console.error('Ошибка удаления из списка "Смотреть позже":', err);
    }
}

/* ===== Recommendations ===== */
$('#getRecommendBtn').addEventListener('click', async () => {
    const idsStr = $('#movieTmdbIds').value.trim();
    if (!idsStr) {
        $('#recommendEmpty').classList.remove('hidden');
        return;
    }

    const tmdbIds = idsStr.split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n));
    if (tmdbIds.length === 0) {
        $('#recommendEmpty').textContent = 'Введите корректные TMDB ID';
        $('#recommendEmpty').classList.remove('hidden');
        return;
    }

    const k = parseInt($('#recommendCount').value) || 10;

    $('#recommendEmpty').classList.add('hidden');
    $('#recommendLoading').classList.remove('hidden');
    $('#recommendGrid').innerHTML = '';

    try {
        const res = await fetch(`${RECOMMENDER_URL}/api/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tmdb_ids: tmdbIds, k, alpha: 0.75 }),
        });

        const data = await res.json();

        if (data.recommendations && data.recommendations.length > 0) {
            for (const rec of data.recommendations) {
                // Fetch poster from backend
                try {
                    const detailRes = await fetch(`/api/movies/${rec.tmdb_id}`);
                    if (detailRes.ok) {
                        const detail = await detailRes.json();
                        const card = createMovieCard({ id: rec.tmdb_id, title: rec.title || detail.title });
                        card._movieDetail = detail;

                        if (detail.poster_path) {
                            const img = card.querySelector('.movie-card__poster');
                            img.src = getPosterUrl(detail.poster_path);
                            img.classList.remove('movie-card__poster--placeholder');
                        }

                        $('#recommendGrid').appendChild(card);
                    }
                } catch (err) {
                    console.error(`Ошибка загрузки детали для ${rec.tmdb_id}:`, err);
                }
            }
        } else {
            $('#recommendEmpty').textContent = 'Рекомендации не найдены';
            $('#recommendEmpty').classList.remove('hidden');
        }
    } catch (err) {
        console.error('Ошибка получения рекомендаций:', err);
        $('#recommendEmpty').textContent = 'Ошибка загрузки рекомендаций';
        $('#recommendEmpty').classList.remove('hidden');
    } finally {
        $('#recommendLoading').classList.add('hidden');
    }
});

/* ===== Init ===== */
async function init() {
    updateAuthUI();
    showPage('home');
    await loadMovies();
}

init();
