import { z } from "zod";

export const createProductSchema = z.object({
	name: z
		.string({
			required_error: "Product name is required",
			invalid_type_error: "Product name must be a string",
		})
		.trim()
		.min(3, "Product name must be at least 3 characters long.")
		.max(100, "Product name cannot exceed 100 characters."),

	description: z
		.string({
			required_error: "Product description is required",
			invalid_type_error: "Description must be a string",
		})
		.trim()
		.max(500, "Description cannot exceed 500 characters."),

	basePrice: z.coerce
		.number({
			required_error: "Base price is required",
			invalid_type_error: "Base price must be a number",
		})
		.nonnegative("Base price cannot be negative")
		.max(999999, "Base price cannot exceed 999,999."), // Adjust the max limit as needed

	categoryId: z.coerce
		.number({
			required_error: "Category ID is required",
			invalid_type_error: "Category ID must be a number",
		})
		.int("Category ID must be an integer")
		.positive("Category ID must be a positive number"),
});

export const updateProductSchema = z.object({
	name: z
		.string({
			invalid_type_error: "Product name must be a string",
		})
		.trim()
		.min(3, "Product name must be at least 3 characters long.")
		.max(100, "Product name cannot exceed 100 characters.")
		.optional(),

	description: z
		.string({
			invalid_type_error: "Description must be a string",
		})
		.trim()
		.max(500, "Description cannot exceed 500 characters.")
		.optional(),

	basePrice: z.coerce
		.number({
			invalid_type_error: "Base price must be a number",
		})
		.nonnegative("Base price cannot be negative")
		.max(999999, "Base price cannot exceed 999,999.")
		.optional(),

	categoryId: z.coerce
		.number({
			invalid_type_error: "Category ID must be a number",
		})
		.int("Category ID must be an integer")
		.positive("Category ID must be a positive number")
		.optional(),
});
