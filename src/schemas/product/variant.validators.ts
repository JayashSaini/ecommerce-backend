import { z } from "zod";
import { AvailableProductSizes } from "../../constants.js";

export const createProductVariantSchema = z.object({
	productId: z.coerce
		.number({
			required_error: "Product ID is required",
			invalid_type_error: "Product ID must be a number",
		})
		.int("Product ID must be an integer")
		.positive("Product ID must be a positive number"),

	size: z
		.array(z.string(), {
			invalid_type_error: "Size must be an array of allowed values",
			required_error: "Size is required",
		})
		.nonempty("At least one size must be selected")
		.superRefine((arr, ctx) => {
			arr.forEach((val, index) => {
				if (!AvailableProductSizes.includes(val as any)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Invalid size '${val}' provided. Allowed sizes: ${AvailableProductSizes.join(
							", "
						)}`,
						path: [index], // This ensures error points to `size.2` etc.
					});
				}
			});
		})
		.optional(),

	color: z
		.string({
			invalid_type_error: "Color must be a string",
		})
		.trim()
		.max(30, "Color cannot exceed 30 characters.")
		.optional(),

	material: z
		.string({
			invalid_type_error: "Material must be a string",
		})
		.trim()
		.max(50, "Material cannot exceed 50 characters.")
		.optional(),

	additionalPrice: z.coerce
		.number({
			required_error: "Additional price is required",
			invalid_type_error: "Additional price must be a number",
		})
		.nonnegative("Additional price cannot be negative")
		.max(99999, "Additional price cannot exceed 99,999.") // Adjust max limit as needed
		.default(0),

	stockQty: z.coerce
		.number({
			required_error: "Stock quantity is required",
			invalid_type_error: "Stock quantity must be a number",
		})
		.nonnegative("Stock quantity cannot be negative"),
	title: z
		.string({
			invalid_type_error: "title must be a string",
		})
		.trim()
		.max(100, "title cannot exceed 100 characters."),
});

export const updateProductVariantSchema = z.object({
	size: z
		.array(z.string(), {
			invalid_type_error: "Size must be an array of allowed values",
			required_error: "Size is required",
		})
		.nonempty("At least one size must be selected")
		.superRefine((arr, ctx) => {
			arr.forEach((val, index) => {
				if (!AvailableProductSizes.includes(val as any)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Invalid size '${val}' provided. Allowed sizes: ${AvailableProductSizes.join(
							", "
						)}`,
						path: [index], // This ensures error points to `size.2` etc.
					});
				}
			});
		})
		.optional(),

	color: z
		.string({
			invalid_type_error: "Color must be a string",
		})
		.trim()
		.max(30, "Color cannot exceed 30 characters.")
		.optional(),
	title: z
		.string({
			invalid_type_error: "title must be a string",
		})
		.trim()
		.max(100, "title cannot exceed 100 characters.")
		.optional(),

	material: z
		.string({
			invalid_type_error: "Material must be a string",
		})
		.trim()
		.max(50, "Material cannot exceed 50 characters.")
		.optional(),

	additionalPrice: z
		.number({
			invalid_type_error: "Additional price must be a number",
		})
		.nonnegative("Additional price cannot be negative")
		.max(99999, "Additional price cannot exceed 99,999.")
		.optional(),

	stockQty: z.coerce
		.number({
			invalid_type_error: "Stock quantity must be a number",
		})
		.int("Stock quantity must be an integer")
		.nonnegative("Stock quantity cannot be negative")
		.optional(),
});
