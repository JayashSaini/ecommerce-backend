import dotenv from "dotenv";

dotenv.config({
	path: `.env.${process.env.NODE_ENV}`,
});

export const config = {
	nodeEnv: (process.env.NODE_ENV || "development") as
		| "development"
		| "production",
	port: process.env.PORT || 8000,
	host: process.env.HOST || "127.0.0.1",
	databaseUrl: process.env.DATABASE_URL || "",
	corsOrigin: process.env.CORS_ORIGIN || "*",

	accessToken: {
		secret: process.env.ACCESS_TOKEN_SECRET || "default_secret",
	},

	refreshToken: {
		secret: process.env.REFRESH_TOKEN_SECRET || "default_secret",
	},

	kafka: {
		clientId: process.env.KAFKA_CLIENT_ID,
		brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
		groupId: process.env.KAFKA_GROUP_ID,
		topics: {
			email: process.env.KAFKA_EMAIL_TOPIC,
		},
	},
	s3: {
		accessKey: process.env.S3_ACCESS_KEY,
		secretAccessKey: process.env.S3_SECRET_KEY,
		region: process.env.S3_REGION,
		bucketName: process.env.S3_BUCKET_NAME,
	},
	cloudfront: {
		domain: process.env.CLOUDFRONT_DOMAIN,
	},
	redis: {
		port: process.env.REDIS_PORT || 6379,
		host: process.env.REDIS_HOST || "127.0.0.1",
	},
};
