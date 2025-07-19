import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { prisma } from "../../db/index.js";
import {
	createCouponSchema,
	updateCouponSchema,
} from "../../schemas/coupon/index.validators.js";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { calculateCartTotal } from "../../service/cart.service.js";

// Create a new coupon
const createCoupon = asyncHandler(async (req: Request, res: Response) => {
	const validatedData = createCouponSchema.parse(req.body);

	const existingCoupon = await prisma.coupon.findUnique({
		where: { code: validatedData.code },
	});

	if (existingCoupon) {
		throw new ApiError(400, "Coupon code already exists");
	}

	const coupon = await prisma.coupon.create({
		data: validatedData,
	});

	return res
		.status(201)
		.json(new ApiResponse(201, coupon, "Coupon created successfully"));
});

// Get all coupons
const getAllCoupons = asyncHandler(async (req: Request, res: Response) => {
	const coupons = await prisma.coupon.findMany({
		orderBy: { id: "desc" },
	});

	return res
		.status(200)
		.json(new ApiResponse(200, coupons, "Coupons retrieved successfully"));
});

// Get coupon by ID
const getCouponById = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params;

	const coupon = await prisma.coupon.findUnique({
		where: { id: Number(id) },
	});

	if (!coupon) {
		throw new ApiError(404, "Coupon not found");
	}

	return res
		.status(200)
		.json(new ApiResponse(200, coupon, "Coupon retrieved successfully"));
});

// Update coupon
const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params;
	const validatedData = updateCouponSchema.parse(req.body);

	// Check if coupon exists
	const existingCoupon = await prisma.coupon.findUnique({
		where: { id: Number(id) },
	});

	if (!existingCoupon) {
		throw new ApiError(404, "Coupon not found");
	}

	// If code is being updated, check for uniqueness
	if (validatedData.code) {
		const codeExists = await prisma.coupon.findFirst({
			where: {
				code: validatedData.code,
				id: { not: Number(id) },
			},
		});

		if (codeExists) {
			throw new ApiError(400, "Coupon code already exists");
		}
	}

	const updatedCoupon = await prisma.coupon.update({
		where: { id: Number(id) },
		data: validatedData,
	});

	return res
		.status(200)
		.json(new ApiResponse(200, updatedCoupon, "Coupon updated successfully"));
});

// Delete coupon
const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params;

	// Check if coupon exists
	const existingCoupon = await prisma.coupon.findUnique({
		where: { id: Number(id) },
	});

	if (!existingCoupon) {
		throw new ApiError(404, "Coupon not found");
	}

	// Check if coupon is being used in any orders
	const orderCoupon = await prisma.orderCoupon.findFirst({
		where: { couponId: Number(id) },
	});

	if (orderCoupon) {
		throw new ApiError(
			400,
			"Cannot delete coupon as it is being used in orders"
		);
	}

	await prisma.coupon.delete({
		where: { id: Number(id) },
	});

	return res
		.status(200)
		.json(new ApiResponse(200, null, "Coupon deleted successfully"));
});

// Apply coupon to order
const applyCouponToOrder = asyncHandler(async (req: Request, res: Response) => {
	const { orderId, couponCode } = req.body;

	// Validate order exists
	const order = await prisma.order.findUnique({
		where: { id: Number(orderId) },
		include: { coupons: true },
	});

	if (!order) {
		throw new ApiError(404, "Order not found");
	}

	// Validate coupon exists and is not expired
	const coupon = await prisma.coupon.findUnique({
		where: { code: couponCode },
	});

	if (!coupon) {
		throw new ApiError(404, "Coupon not found");
	}

	if (coupon.expiryDate < new Date()) {
		throw new ApiError(400, "Coupon has expired");
	}

	// Check if coupon is already applied to the order
	const isCouponApplied = order.coupons.some(
		(orderCoupon) => orderCoupon.couponId === coupon.id
	);

	if (isCouponApplied) {
		throw new ApiError(400, "Coupon is already applied to this order");
	}

	// Apply coupon to order
	await prisma.orderCoupon.create({
		data: {
			orderId: Number(orderId),
			couponId: coupon.id,
		},
	});

	// Calculate new total amount
	const discountAmount =
		Number(order.totalAmount) * (Number(coupon.discount) / 100);
	const newTotalAmount = Number(order.totalAmount) - discountAmount;

	// Update order total
	const updatedOrder = await prisma.order.update({
		where: { id: Number(orderId) },
		data: { totalAmount: new Prisma.Decimal(newTotalAmount) },
		include: { coupons: true },
	});

	return res
		.status(200)
		.json(new ApiResponse(200, updatedOrder, "Coupon applied successfully"));
});

// Apply coupon to cart
const applyCouponToCart = asyncHandler(async (req: Request, res: Response) => {
	const { cartId, couponCode } = req.body;

	// Find the user's cart and include items, their product, and variant if exists
	const cart = await prisma.cart.findFirst({
		where: { id: cartId },
		include: {
			items: {
				include: {
					product: true,
					variant: true,
				},
			},
			coupons: true,
		},
	});
	if (!cart) {
		throw new ApiError(404, "Cart not found");
	}

	// Validate coupon exists and is not expired
	const coupon = await prisma.coupon.findUnique({
		where: { code: couponCode },
	});

	if (!coupon) {
		throw new ApiError(404, "Coupon not found");
	}

	if (coupon.expiryDate < new Date()) {
		throw new ApiError(400, "Coupon has expired");
	}

	// Check if coupon is already applied to the cart
	const isCouponApplied = cart.coupons.some(
		(cartCoupon) => cartCoupon.couponId === coupon.id
	);

	if (isCouponApplied) {
		throw new ApiError(400, "Coupon is already applied to this cart");
	}

	await prisma.cartCoupon.upsert({
		where: {
			cartId: Number(cartId), // This requires cartId to be UNIQUE in cartCoupon
		},
		update: {
			couponId: coupon.id,
		},
		create: {
			cartId: Number(cartId),
			couponId: coupon.id,
		},
	});
	const amount = await calculateCartTotal(cart.items, coupon);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				{ cart: cart, ...amount },
				"Coupon applied successfully"
			)
		);
});

export {
	createCoupon,
	getAllCoupons,
	getCouponById,
	updateCoupon,
	deleteCoupon,
	applyCouponToOrder,
	applyCouponToCart,
};
