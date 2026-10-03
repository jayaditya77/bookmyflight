const createBullConnection = () => {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required for the booking worker queue.');
  }

  const redisUrl = new URL(process.env.REDIS_URL);
  const database = redisUrl.pathname.slice(1);
  const connection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    maxRetriesPerRequest: null,
    ...(redisUrl.username ? { username: decodeURIComponent(redisUrl.username) } : {}),
    ...(redisUrl.password ? { password: decodeURIComponent(redisUrl.password) } : {}),
    ...(database ? { db: Number(database) } : {}),
    ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {})
  };

  return connection;
};

module.exports = createBullConnection;