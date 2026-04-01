// Скрипт для инициализации базы данных
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  console.log('Initializing database...');
  
  try {
    // Читаем SQL файл
    const sqlPath = path.join(__dirname, '../migrations/init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Выполняем SQL
    await pool.query(sql);
    
    console.log('Database initialized successfully!');
    
    // Проверяем данные
    const moviesResult = await pool.query('SELECT COUNT(*) FROM movies');
    const ratingsResult = await pool.query('SELECT COUNT(*) FROM ratings');
    const favoritesResult = await pool.query('SELECT COUNT(*) FROM user_favorite_movies');
    
    console.log(`
 Database stats:
   - Movies: ${moviesResult.rows[0].count}
   - Ratings: ${ratingsResult.rows[0].count}
   - Favorites: ${favoritesResult.rows[0].count}
    `);
    
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();