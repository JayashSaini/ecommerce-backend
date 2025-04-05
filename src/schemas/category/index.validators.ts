import { z } from "zod";

export const createCategorySchema = z.object({
	name: z
		.string({
			required_error: "Category name is required",
			invalid_type_error: "Category name must be a string",
		})
		.trim()
		.min(3, "Category name must be at least 3 characters long.")
		.max(100, "Category name cannot exceed 100 characters."),

	description: z
		.string({
			required_error: "Category description is required",
			invalid_type_error: "Description must be a string",
		})
		.trim()
		.max(500, "Description cannot exceed 500 characters."),
});

export const updateCategorySchema = z.object({
	name: z
		.string({
			invalid_type_error: "Category name must be a string",
		})
		.trim()
		.min(3, "Category name must be at least 3 characters long.")
		.max(100, "Category name cannot exceed 100 characters.")
		.optional(),

	description: z
		.string({
			invalid_type_error: "Description must be a string",
		})
		.trim()
		.max(500, "Description cannot exceed 500 characters.")
		.optional(),
});
