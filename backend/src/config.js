require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT || 3001),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  memcached: {
    host: process.env.MEMCACHED_HOST || 'localhost',
    port: Number(process.env.MEMCACHED_PORT || 11211),
  },
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
};