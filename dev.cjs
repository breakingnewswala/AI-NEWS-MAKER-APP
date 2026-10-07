/**
 * Cross-platform local dev runner for AI News Maker
 * Sets default PORT=3000 and starts server.cjs
 */
process.env.PORT = process.env.PORT || '3000';
require('./server.cjs');
