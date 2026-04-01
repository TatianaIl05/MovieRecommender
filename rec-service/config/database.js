const { Pool } = require('pg');
require('dotenv').config();

// Создаем пул соединений с PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'movierec',
  max: 20, // максимум соединений в пуле
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Проверка подключения
pool.on('connect', () => {
  console.log('Подключено к PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Ошибка подключения к PostgreSQL:', err);
});

// Функция для выполнения запросов
const query = (text, params) => pool.query(text, params);

// Функция для получения клиента (транзакции)
const getClient = () => pool.connect();

module.exports = {
  pool,
  query,
  getClient,
};
