import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { prisma } from "../../db/index.js";
import {
	createProductVariantSchema,
	updateProductVariantSchema,
} from "../../schemas/product/varient.validators.js";
import { deleteImageFromS3, uploadImageToS3 } from "../../utils/s3.js";
import { generateUniqueFilename } from "../../utils/generalUtils.js";
import { ProductImage } from "../../types/index.js";
import { Prisma } from "@prisma/client";
import { deleteVariantService } from "../../service/products.service.js";

export const createVariant = asyncHandler(async (req, res) => {
	let { productId, size, color, material, additionalPrice, stockQty } =
		req.body;

	// Convert stringified size to array if it's a string
	if (typeof size === "string") size = JSON.parse(size);

	// ✅ Validate input data
	createProductVariantSchema.parse({
		productId,
		size,
		color,
		material,
		additionalPrice,
		stockQty,
	});

	const product = await prisma.product.findUnique({
		where: { id: Number(productId) }, // or just `productId` if already a number
	});

	if (!product) {
		throw new ApiError(404, "Product not found.");
	}

	// Count existing variants
	const count = await prisma.productVariant.count({
		where: { productId: Number(productId) },
	});

	if (count >= 1) {
		throw new ApiError(400, "Variants limit exceeded. Max 4 allowed.");
	}

	const images = req.files as Express.Multer.File[];

	// Ensure at least one image is uploaded
	if (!images || images.length === 0) {
		throw new ApiError(400, "At least one product image is required.");
	}

	// Upload images to S3
	const uploadedImages = await Promise.all(
		images.map(async (image) => {
			const key = generateUniqueFilename(image.originalname);
			const uploadedImage = await uploadImageToS3(
				key,
				image.buffer,
				image.mimetype
			);

			if (!uploadedImage) {
				throw new ApiError(500, "Failed to upload an image. Try again.");
			}

			return {
				url: uploadedImage.imageUrl,
				key: uploadedImage.key,
			};
		})
	);

	// Create the product variant
	const productVariant = await prisma.productVariant.create({
		data: {
			productId: Number(productId),
			size,
			color,
			material,
			images: uploadedImages, // Now storing an array of images
			additionalPrice,
			stockQty: Number(stockQty),
		},
	});

	// Return success response
	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				productVariant,
				"Product variant created successfully."
			)
		);
});

// Get all variants for a specific product
export const getVariantsByProductId = asyncHandler(async (req, res) => {
	const { productId } = req.params;

	const variants = await prisma.productVariant.findMany({
		where: { productId: Number(productId) },
	});

	if (!variants.length) {
		throw new ApiError(404, "No variants found for this product.");
	}

	res
		.status(200)
		.json(new ApiResponse(200, variants, "Variants retrieved successfully."));
});

export const getVariantById = asyncHandler(async (req, res) => {
	const { variantId } = req.params;

	const variant = await prisma.productVariant.findFirst({
		where: { id: Number(variantId) },
	});

	if (!variant) {
		throw new ApiError(404, "No variant found for this product.");
	}

	res
		.status(200)
		.json(new ApiResponse(200, variant, "Variants retrieved successfully."));
});

// Update variant details
export const updateVariant = asyncHandler(async (req, res) => {
	const { variantId } = req.params;
	let { size, color, material, additionalPrice, stockQty } = req.body;

	// Convert stringified size to array if it's a string
	if (typeof size === "string") size = JSON.parse(size);

	updateProductVariantSchema.parse({
		size,
		color,
		material,
		additionalPrice,
		stockQty,
	});

	const updatedVariant = await prisma.productVariant.update({
		where: { id: Number(variantId) },
		data: {
			size,
			color,
			material,
			additionalPrice: Number(additionalPrice),
			stockQty: Number(stockQty),
		},
	});

	res
		.status(200)
		.json(
			new ApiResponse(200, updatedVariant, "Variant updated successfully.")
		);
});

// Delete a variant
export const deleteVariant = asyncHandler(async (req, res) => {
	const { variantId } = req.params;

	const variant = await prisma.productVariant.findUnique({
		where: { id: Number(variantId) },
	});

	if (!variant) {
		throw new ApiError(404, "Variant not found.");
	}

	await deleteVariantService(variant);

	res
		.status(200)
		.json(new ApiResponse(200, null, "Variant deleted successfully."));
});

// Delete a specific image from a variant
export const deleteVariantImage = asyncHandler(async (req, res) => {
	const { variantId, imageKey } = req.params;

	const variant = await prisma.productVariant.findUnique({
		where: { id: Number(variantId) },
	});

	if (!variant) {
		throw new ApiError(404, "Variant not found.");
	}

	const variantImages = variant.images as unknown as ProductImage[];

	const updatedImages: ProductImage[] = variantImages.filter(
		(img: ProductImage) => img.key !== imageKey
	);

	if (updatedImages.length === variantImages.length) {
		throw new ApiError(400, "Image not found in this variant.");
	}

	await deleteImageFromS3(imageKey);

	await prisma.productVariant.update({
		where: { id: Number(variantId) },
		data: { images: updatedImages as unknown as Prisma.InputJsonValue[] },
	});

	res
		.status(200)
		.json(
			new ApiResponse(200, null, "Image deleted successfully from variant.")
		);
});
