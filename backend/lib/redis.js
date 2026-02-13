const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      console.log("Redis reconnect attempt:", retries);
      return Math.min(retries * 100, 3000);
    }
  }
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

redisClient.on("connect", () => {
  console.log("Redis Connecting...");
});

redisClient.on("ready", () => {
  
  console.log("Redis Connected");
});

(async () => {
console.log("Redis cleared.");

  await redisClient.connect();
})();

module.exports = redisClient;
