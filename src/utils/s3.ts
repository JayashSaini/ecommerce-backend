import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "../config/index.js";
import logger from "../logger/winston.logger.js";

// Define an S3 Client
const s3Client = new S3Client({
	region: config.s3.region,
	credentials: {
		accessKeyId: config.s3.accessKey,
		secretAccessKey: config.s3.secretAccessKey,
	},
});

// Define the response type for uploadImageToS3
export interface UploadResponse {
	imageUrl: string;
	key: string;
}

/**
 * Uploads an image to S3 and returns the CloudFront URL.
 * @param key - The file name (e.g., "products/image.jpg").
 * @param fileBuffer - The file buffer.
 * @param contentType - The MIME type (e.g., "image/jpeg").
 * @returns A Promise that resolves with the CloudFront image URL.
 */
export async function uploadImageToS3(
	key: string,
	fileBuffer: Buffer,
	contentType: string
): Promise<UploadResponse | false> {
	try {
		const command = new PutObjectCommand({
			Bucket: config.s3.bucketName,
			Key: `products/${key}`, // Store under "products/" folder
			Body: fileBuffer,
			ContentType: contentType,
		});

		await s3Client.send(command);

		// Use CloudFront URL instead of S3 URL
		return {
			imageUrl: `https://${config.cloudfront.domain}/products/${key}`, // CloudFront URL
			key: key,
		};
	} catch (error) {
		logger.error("Error uploading image to S3:", error);
		return false;
	}
}

/**
 * Deletes an image from S3.
 * @param key - The file name (e.g., "products/image.jpg").
 * @returns A Promise that resolves with a boolean indicating success.
 */
export async function deleteImageFromS3(key: string): Promise<boolean> {
	const command = new DeleteObjectCommand({
		Bucket: config.s3.bucketName,
		Key: `products/${key}`,
	});

	await s3Client.send(command);
	console.log(`🗑 Image deleted successfully: ${key}`);
	return true;
}

/**
 * Gets the CloudFront URL of an image.
 * @param key - The file name (e.g., "products/image.jpg").
 * @returns The CloudFront URL as a string.
 */
export function getImageUrlFromS3(key: string): string {
	return `https://${config.cloudfront.domain}/products/${key}`; // Use CloudFront URL
}
