import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { prisma } from "../../db/index.js";
import {
	createCategorySchema,
	updateCategorySchema,
} from "../../schemas/category/index.validators.js";

// Create a new category
export const createCategory = asyncHandler(async (req, res) => {
	const { name, description } = req.body;

	createCategorySchema.parse({ name, description });

	const category = await prisma.category.create({
		data: { name, description },
	});

	if (!category) {
		throw new ApiError(400, "Failed to create category.");
	}

	return res
		.status(201)
		.json(new ApiResponse(201, category, "Category created successfully."));
});

// Get all categories
export const getAllCategories = asyncHandler(async (req, res) => {
	const categories = await prisma.category.findMany();

	return res
		.status(200)
		.json(new ApiResponse(200, categories, "Categories fetched successfully."));
});

// Get category by ID
export const getCategoryById = asyncHandler(async (req, res) => {
	const { id } = req.params;

	const category = await prisma.category.findUnique({
		where: { id: Number(id) },
		include: { products: true }, // Include associated products if needed
	});

	if (!category) {
		throw new ApiError(404, "Category not found.");
	}

	return res
		.status(200)
		.json(new ApiResponse(200, category, "Category fetched successfully."));
});

// Update category
export const updateCategory = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const { name, description } = req.body;

	updateCategorySchema.parse({ name, description });

	const category = await prisma.category.update({
		where: { id: Number(id) },
		data: { name, description },
	});

	if (!category) {
		throw new ApiError(400, "Failed to update category.");
	}

	return res
		.status(200)
		.json(new ApiResponse(200, category, "Category updated successfully."));
});

// Delete category
export const deleteCategory = asyncHandler(async (req, res) => {
	const { id } = req.params;

	// Check if category exists
	const category = await prisma.category.findUnique({
		where: { id: Number(id) },
	});

	if (!category) {
		throw new ApiError(404, "Category not found.");
	}

	// Delete the category
	await prisma.category.delete({
		where: { id: Number(id) },
	});

	return res
		.status(200)
		.json(new ApiResponse(200, null, "Category deleted successfully."));
});
