// redisClient.ts
import Redis from "ioredis";
import { config } from "./index.js";
import logger from "../logger/winston.logger.js";

const redis = new Redis({
	host: config.redis.host,
	port: Number(config.redis.port), // Convert to number
	db: 0, // Default DB number
});

// Event listeners for connection events

// Function to test the connection
const startRedis = async (): Promise<void> => {
	try {
		redis.on("connect", () => {});

		redis.on("error", (err: Error) => {
			logger.error("Redis connection Error:", err);
			process.exit(1);
		});

		await redis.set("testKey", "testValue");
		await redis.get("testKey");
		await redis.del("testKey");
		logger.info("✅ Successfully connected to the Redis server");
	} catch (err) {
		logger.error("Error during Redis test:", err);
		process.exit(1);
	}
};

// Function to disconnect from Redis
const disconnectRedis = (): void => {
	redis.quit(); // Gracefully disconnect from the Redis server
	logger.info("Disconnected from Redis.");
};

export { startRedis, redis, disconnectRedis };
