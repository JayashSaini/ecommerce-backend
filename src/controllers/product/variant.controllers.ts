import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { prisma } from "../../db/index.js";
import {
	createProductVariantSchema,
	updateProductVariantSchema,
} from "../../schemas/product/variant.validators.js";
import { deleteImageFromS3, uploadImageToS3 } from "../../utils/s3.js";
import { generateUniqueFilename } from "../../utils/generalUtils.js";
import { ProductImage } from "../../types/index.js";
import { Prisma } from "@prisma/client";
import { deleteVariantService } from "../../service/products.service.js";
import { MAX_IMAGE_COUNT, MAX_VARIANT_COUNT } from "../../constants.js";
import { Request, Response } from "express";

export const createVariant = asyncHandler(async (req, res) => {
	let { productId, size, color, material, additionalPrice, stockQty, title } =
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
		title,
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

	if (count >= MAX_VARIANT_COUNT) {
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
			title,
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
		include: {
			product: true,
		},
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
	let { size, color, material, additionalPrice, stockQty, title } = req.body;

	const updateData: any = {};

	if (size !== undefined)
		updateData.size = typeof size === "string" ? JSON.parse(size) : size;
	if (color !== undefined) updateData.color = color;
	if (title !== undefined) updateData.title = title;
	if (material !== undefined) updateData.material = material;
	if (additionalPrice !== undefined)
		updateData.additionalPrice = Number(additionalPrice);
	if (stockQty !== undefined) updateData.stockQty = Number(stockQty);

	const updatedVariant = await prisma.productVariant.update({
		where: { id: Number(variantId) },
		data: updateData,
	});

	updateProductVariantSchema.parse(updateData);

	res
		.status(200)
		.json(
			new ApiResponse(200, updatedVariant, "Variant updated successfully.")
		);
});

// Delete a variant
export const deleteVariant = asyncHandler(async (req, res) => {
	const { variantId } = req.params;

	const variant = await prisma.productVariant.findFirst({
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

/**
 * @desc    Upload a variant image and update the variant's image array
 * @route   POST /api/products/:id
 * @access  Private/Admin
 */
export const uploadVariantImage = asyncHandler(
	async (req: Request, res: Response) => {
		const variantId = Number(req.params.id);

		// Fetch existing variant and its images
		const variant = await prisma.productVariant.findUnique({
			where: { id: variantId },
			select: { images: true }, // images is a JSON array field
		});

		if (!variant) {
			throw new ApiError(404, "Variant not found.");
		}

		const existingImages = Array.isArray(variant.images) ? variant.images : [];

		// Enforce maximum image count
		if (existingImages.length >= MAX_IMAGE_COUNT) {
			throw new ApiError(
				400,
				`Maximum image limit of ${MAX_IMAGE_COUNT} reached.`
			);
		}

		const uploadedFile = req.file as Express.Multer.File;

		if (!uploadedFile) {
			throw new ApiError(400, "Image file is required.");
		}

		// Upload image to S3
		const uniqueKey = generateUniqueFilename(uploadedFile.originalname);
		const uploadResult = await uploadImageToS3(
			uniqueKey,
			uploadedFile.buffer,
			uploadedFile.mimetype
		);

		if (!uploadResult) {
			throw new ApiError(500, "Failed to upload image to cloud storage.");
		}

		// Construct new image object
		const newImage = {
			url: uploadResult.imageUrl,
			key: uploadResult.key,
		};

		// Append new image to existing images
		const updatedImageArray: Prisma.JsonArray = [...existingImages, newImage];

		// Update variant record with new image array
		const updatedVariant = await prisma.productVariant.update({
			where: { id: variantId },
			data: {
				images: updatedImageArray as unknown as Prisma.InputJsonValue[],
			},
		});

		return res
			.status(200)
			.json(
				new ApiResponse(
					200,
					updatedVariant,
					"Variant image uploaded successfully."
				)
			);
	}
);

/**
 * Update the order of product images
 * @route PATCH /api/products/:id/images/reorder
 * @param {number} id - Product ID
 * @param {Array<ProductImage>} newImagesOrder - New order of product images
 * @returns {Object} Updated product
 * @throws {ApiError} 404 - Product not found
 * @throws {ApiError} 400 - Invalid image order
 */
export const updateVariantImageOrder = asyncHandler(
	async (req: Request, res: Response) => {
		const variantId = Number(req.params.id);
		const { newImagesOrder } = req.body as { newImagesOrder: ProductImage[] };

		// Fetch the variant
		const variant = await prisma.productVariant.findUnique({
			where: { id: variantId },
			select: { images: true },
		});

		// Check if variant exists
		if (!variant) {
			throw new ApiError(404, "Variant not found.");
		}
		// Validate new image order
		if (newImagesOrder?.length !== variant.images?.length) {
			throw new ApiError(
				400,
				"New image order must include all existing images."
			);
		}

		// Update product with new image order
		const updatedProduct = await prisma.productVariant.update({
			where: { id: variantId },
			data: {
				images: newImagesOrder as unknown as Prisma.InputJsonValue[],
			},
		});

		// Send response
		return res
			.status(200)
			.json(
				new ApiResponse(
					200,
					updatedProduct,
					"Variant image order updated successfully."
				)
			);
	}
);
