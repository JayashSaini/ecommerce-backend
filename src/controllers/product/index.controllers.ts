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
import { ProductStatusEnum } from "../../constants.js";
import { ProductImage } from "../../types/index.js";
import { Prisma } from "@prisma/client";
import { deleteProductsVariantsService } from "../../service/products.service.js";

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

	updateProductSchema.parse(req.body); // Validate input data

	const updatedProduct = await prisma.product.update({
		where: { id: Number(id) },
		data: req.body,
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
		data: { images: updatedImages as unknown as Prisma.InputJsonValue[] },
	});

	res
		.status(200)
		.json(
			new ApiResponse(200, null, "Image deleted successfully from product.")
		);
});
