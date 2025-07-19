import { z } from "zod";

export const createCouponSchema = z.object({
	code: z
		.string({
			required_error: "Coupon code is required",
			invalid_type_error: "Coupon code must be a string",
		})
		.trim()
		.min(3, "Coupon code must be at least 3 characters long")
		.max(20, "Coupon code cannot exceed 20 characters")
		.transform((val) => val.toUpperCase()),

	discount: z.coerce
		.number({
			required_error: "Discount amount is required",
			invalid_type_error: "Discount must be a number",
		})
		.positive("Discount must be a positive number")
		.max(100, "Discount cannot exceed 100%"),

	expiryDate: z.coerce
		.date({
			required_error: "Expiry date is required",
			invalid_type_error: "Expiry date must be a valid date",
		})
		.refine((date) => date > new Date(), {
			message: "Expiry date must be in the future",
		}),
});

export const updateCouponSchema = z.object({
	code: z
		.string({
			invalid_type_error: "Coupon code must be a string",
		})
		.trim()
		.min(3, "Coupon code must be at least 3 characters long")
		.max(20, "Coupon code cannot exceed 20 characters")
		.transform((val) => val.toUpperCase())
		.optional(),

	discount: z.coerce
		.number({
			invalid_type_error: "Discount must be a number",
		})
		.positive("Discount must be a positive number")
		.max(100, "Discount cannot exceed 100%")
		.optional(),

	expiryDate: z.coerce
		.date({
			invalid_type_error: "Expiry date must be a valid date",
		})
		.refine((date) => date > new Date(), {
			message: "Expiry date must be in the future",
		})
		.optional(),
});
