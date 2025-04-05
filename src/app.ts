import express, { Request, Response } from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import requestIp from "request-ip";
import compression from "compression";

import { ApiError } from "./utils/ApiError.js";
import cookieParser from "cookie-parser";
import morganMiddleware from "./logger/morgon.logger.js";
import { config } from "./config/index.js";

const app = express();

// Add type for environment variables
declare global {
	namespace NodeJS {
		interface ProcessEnv {
			CORS_ORIGIN: string;
			NODE_ENV: "development" | "production";
			// Add other env variables
		}
	}
}

// Separate middleware configuration
const corsOptions: cors.CorsOptions = {
	origin: config.corsOrigin === "*" ? "*" : config.corsOrigin.split(","),
	credentials: true,
};

app.use(cors(corsOptions));

app.use(requestIp.mw());

// Rate limiter to avoid misuse of the service and avoid cost spikes
const limiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 100, // Limit each IP to 100 requests per minute
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request) => req.clientIp || "unknown-ip",
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public")); // configure static file to save images locally
app.use(cookieParser());

// Gzip compression with filter to exclude images
app.use(
	compression({
		filter: (req, res) => {
			// Get the Content-Type header and cast it to string
			const contentType = String(res.getHeader("Content-Type") || "");

			// Exclude images from compression
			if (/image\//.test(contentType)) {
				return false;
			}
			return true; // Compress everything else
		},
	})
);

// // required for passport
// app.use(
// 	session({
// 		secret: process.env.EXPRESS_SESSION_SECRET,
// 		resave: true,
// 		saveUninitialized: true,
// 	})
// ); // session secret
// app.use(passport.initialize());
// app.use(passport.session()); // persistent login sessions

app.use(morganMiddleware);

import { errorHandler } from "./middlewares/error.middlewares.js";
import { ApiResponse } from "./utils/ApiResponse.js";
import productRoutes from "./routes/product/index.routes.js";
import productVariantsRoutes from "./routes/product/varients.routes.js";
import categoryRoutes from "./routes/category/index.routes.js";

app.use("/api/v1/products", productRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products/variants", productVariantsRoutes);

app.get("/api/v1/healthcheck", (req, res) => {
	res.status(200).json(new ApiResponse(200, {}, "Server is running"));
});

// if endpoint not found
app.use((_, __, next) => {
	const error = new ApiError(404, "endpoint not found");
	next(error);
});

// common error handling middleware
app.use(errorHandler);

// Add Swagger documentation route

export { app };
