import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { prisma } from "../../db/index.js";
import {
	createProductSchema,
	updateProductSchema,
} from "../../schemas/product/index.validators.js";
import { generateUniqueFilename } from "../../utils/generalUtils.js";
import { deleteImageFromS3, uploadImageToS3 } from "../../utils/s3.js";
import { MAX_IMAGE_COUNT, ProductStatusEnum } from "../../constants.js";
import { ProductImage } from "../../types/index.js";
import { Prisma } from "@prisma/client";
import { deleteProductsVariantsService } from "../../service/products.service.js";
import { JsonValue } from "@prisma/client/runtime/library.js";
import { Request, Response } from "express";

/**
 * Get all products
 */
export const getAllProducts = asyncHandler(async (req, res) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		order = "desc",
	} = req.query; // Default sorting by createdAt in descending order

	const validSortFields = ["name", "basePrice", "createdAt"];
	const validOrderValues = ["asc", "desc"];

	// Validate sorting parameters
	const sortField = validSortFields.includes(sortBy?.toString())
		? sortBy.toString()
		: "createdAt";
	const sortOrder = validOrderValues.includes(order.toString().toLowerCase())
		? order.toString().toLowerCase()
		: "desc";

	const products = await prisma.product.findMany({
		include: { category: true }, // <-- This assumes your relation field in Prisma schema is called "variants"
		skip: (Number(page) - 1) * Number(limit),
		take: Number(limit),
		orderBy: {
			[sortField]: sortOrder,
		},
	});

	const totalProducts = await prisma.product.count();

	return res.status(200).json(
		new ApiResponse(
			200,
			{
				products,
				page: Number(page),
				limit: Number(limit),
				totalPages: Math.ceil(totalProducts / Number(limit)),
				totalProducts,
			},
			"Products fetched successfully."
		)
	);
});

/**
 * Get a single product by ID
 */
export const getProductById = asyncHandler(async (req, res) => {
	const { id } = req.params;

	const product = await prisma.product.findUnique({
		where: { id: Number(id) },
		include: {
			variants: true, // <-- This assumes your relation field in Prisma schema is called "variants"
			category: true,
		},
	});

	if (!product) {
		throw new ApiError(404, "Product not found.");
	}

	return res
		.status(200)
		.json(new ApiResponse(200, product, "Product fetched successfully."));
});

/**
 * Create a product by ID
 */
export const createProduct = asyncHandler(async (req, res) => {
	const { name, description, basePrice, categoryId } = req.body;

	// Validate input
	createProductSchema.parse({
		name,
		description,
		basePrice,
		categoryId,
	});

	const images = req.files as Express.Multer.File[]; // Retrieve multiple files
	if (!images || images.length === 0) {
		throw new ApiError(400, "At least one product image is required.");
	}

	// Check if category exists
	const category = await prisma.category.findUnique({
		where: { id: Number(categoryId) },
	});

	if (!category) {
		throw new ApiError(400, "Invalid category. Category does not exist.");
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
				throw new ApiError(
					500,
					"Failed to upload an image to cloud, Try again."
				);
			}

			return { url: uploadedImage.imageUrl, key: uploadedImage.key };
		})
	);

	// Create product
	const product = await prisma.product.create({
		data: {
			basePrice: Number(basePrice),
			name,
			description,
			categoryId: Number(categoryId),
			status: ProductStatusEnum.UNPUBLISHED,
			images: uploadedImages, // Store array of images
		},
	});

	if (!product) {
		throw new ApiError(400, "Failed to create product.");
	}

	return res
		.status(201)
		.json(new ApiResponse(201, product, "Product created successfully."));
});

/**
 * Update a product by ID
 */
export const updateProduct = asyncHandler(async (req, res) => {
	const { id } = req.params;
	let {
		name,
		description,
		categoryId,
		basePrice,
		size,
		color,
		material,
		stockQty,
	} = req.body;

	// Convert numeric strings to proper numbers if needed
	if (basePrice !== undefined) basePrice = Number(basePrice);
	if (categoryId !== undefined) categoryId = Number(categoryId);
	if (stockQty !== undefined) stockQty = Number(stockQty);

	// Build update data object dynamically
	const updateData: any = {};
	if (size !== undefined)
		updateData.size = typeof size === "string" ? JSON.parse(size) : size;
	if (name !== undefined) updateData.name = name;
	if (description !== undefined) updateData.description = description;
	if (categoryId !== undefined) updateData.categoryId = categoryId;
	if (basePrice !== undefined) updateData.basePrice = basePrice;

	if (color !== undefined) updateData.color = color;
	if (material !== undefined) updateData.material = material;
	if (stockQty !== undefined) updateData.stockQty = stockQty;

	// Validate only what is being updated
	updateProductSchema.partial().parse(updateData);

	const updatedProduct = await prisma.product.update({
		where: { id: Number(id) },
		data: updateData,
	});

	if (!updatedProduct) {
		throw new ApiError(400, "Failed to update product.");
	}

	return res
		.status(200)
		.json(
			new ApiResponse(200, updatedProduct, "Product updated successfully.")
		);
});

/**
 * Delete a product by ID
 */
export const deleteProduct = asyncHandler(async (req, res) => {
	const { id } = req.params;

	// Ensure ID is provided
	if (!id) {
		throw new ApiError(400, "Product ID is required.");
	}

	// Check if product exists
	const existingProduct = await prisma.product.findUnique({
		where: { id: Number(id) },
	});

	if (!existingProduct) {
		throw new ApiError(404, "Product doesn't exist.");
	}

	// Type assertion to ensure `images` is an array of objects
	const productImages = existingProduct.images as unknown as ProductImage[];

	// Ensure `productImages` is an array before proceeding
	if (Array.isArray(productImages)) {
		await Promise.all(
			productImages.map(async (image) => {
				await deleteImageFromS3(image.key);
			})
		);
	}

	// delete products variants
	await deleteProductsVariantsService(Number(id));

	await prisma.product.delete({
		where: { id: Number(id) },
	});

	// Return success response
	return res
		.status(200)
		.json(
			new ApiResponse(200, existingProduct, "Product deleted successfully.")
		);
});

// Delete a specific image from a variant
export const deleteProductImage = asyncHandler(async (req, res) => {
	const { id, imageKey } = req.params;

	const product = await prisma.product.findUnique({
		where: { id: Number(id) },
	});

	if (!product) {
		throw new ApiError(404, "Product not found.");
	}

	const variantImages = product.images as unknown as ProductImage[];

	const updatedImages: ProductImage[] = variantImages.filter(
		(img: ProductImage) => img.key !== imageKey
	);

	if (updatedImages.length === variantImages.length) {
		throw new ApiError(400, "Image not found in this product.");
	}

	await deleteImageFromS3(imageKey);

	await prisma.product.update({
		where: { id: Number(id) },
		data: { images: updatedImages as unknown as Prisma.InputJsonValue[][] },
	});

	res
		.status(200)
		.json(
			new ApiResponse(200, null, "Image deleted successfully from product.")
		);
});

/**
 * @desc    Upload a product image and update the product's image array
 * @route   POST /api/products/:id
 * @access  Private/Admin
 */
export const uploadProductImage = asyncHandler(
	async (req: Request, res: Response) => {
		const productId = Number(req.params.id);

		// Fetch existing product and its images
		const product = await prisma.product.findUnique({
			where: { id: productId },
			select: { images: true }, // images is a JSON array field
		});

		if (!product) {
			throw new ApiError(404, "Product not found.");
		}

		const existingImages = Array.isArray(product.images) ? product.images : [];

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

		// Update product record with new image array
		const updatedProduct = await prisma.product.update({
			where: { id: productId },
			data: {
				images: updatedImageArray as unknown as Prisma.InputJsonValue[],
			},
		});

		return res
			.status(200)
			.json(
				new ApiResponse(
					200,
					updatedProduct,
					"Product image uploaded successfully."
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
export const updateProductImageOrder = asyncHandler(
	async (req: Request, res: Response) => {
		const productId = Number(req.params.id);
		const { newImagesOrder } = req.body as { newImagesOrder: ProductImage[] };

		// Fetch the product
		const product = await prisma.product.findUnique({
			where: { id: productId },
			select: { images: true },
		});

		// Check if product exists
		if (!product) {
			throw new ApiError(404, "Product not found.");
		}
		// Validate new image order
		if (newImagesOrder?.length !== product.images?.length) {
			throw new ApiError(
				400,
				"New image order must include all existing images."
			);
		}

		// Update product with new image order
		const updatedProduct = await prisma.product.update({
			where: { id: productId },
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
					"Product image order updated successfully."
				)
			);
	}
);
