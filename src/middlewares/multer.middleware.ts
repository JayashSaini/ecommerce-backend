import { Request } from "express";
import multer from "multer";
import { ApiError } from "../utils/ApiError.js";
import { MAX_IMAGE_COUNT } from "../constants.js";

// Use Memory Storage
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
	const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error("Only .png, .jpeg, .jpg formats are allowed!"), false);
	}
};

export const upload = multer({
	storage,
	limits: { fileSize: 2 * 1024 * 1024 }, // Limit: 2MB
	fileFilter,
}); // Accepts only a single file named 'image'

// Custom error handling middleware
export const handleUploadError = (
	err: any,
	req: Request,
	res: any,
	next: any
) => {
	if (err instanceof multer.MulterError) {
		if (err.code === "LIMIT_FILE_SIZE") {
			throw new ApiError(400, "File size exceeds the limit of 2MB.");
		}
		if (err.code === "LIMIT_FILE_COUNT") {
			return next(
				new ApiError(
					400,
					`You can upload a maximum of ${MAX_IMAGE_COUNT} files.`
				)
			);
		}
	}
	next(err);
};
