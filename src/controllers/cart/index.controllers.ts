import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { prisma } from "../../db/index.js";
import { CART_MAX_ITEM_LIMIT } from "../../constants.js";
import {
	calculateCartTotal,
	getCartDetails,
} from "../../service/cart.service.js";

/**
 * @desc    Add item to cart
 * @route   POST /api/v1/cart
 * @access  Private
 */
/**
 * @desc    Add an item to the user's cart
 * @route   POST /api/v1/cart
 * @access  Private
 */
export const addToCart = asyncHandler(async (req, res) => {
	const { productId, variantId } = req.body;
	const user = req.user;

	// 1. Validate user authentication
	if (!user) {
		throw new ApiError(401, "User is not authorized. Please log in.");
	}

	// 2. Validate required fields
	if (!productId) {
		throw new ApiError(400, "Product ID is required.");
	}

	// 3. Find or create the user's cart
	let cart = await prisma.cart.findFirst({
		where: { userId: user.id },
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
		cart = await prisma.cart.create({
			data: { userId: Number(user.id) },
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
	}

	// 4. Check if the product (and variant, if provided) already exists in the cart
	const isProductInCart = cart.items.some(
		(item) =>
			item.productId === Number(productId) &&
			(variantId ? item.variantId === Number(variantId) : true)
	);

	if (isProductInCart) {
		throw new ApiError(400, "This product is already in your cart.");
	}

	// 5. Enforce cart item limit
	if (cart.items.length >= CART_MAX_ITEM_LIMIT) {
		throw new ApiError(
			400,
			`Cart item limit of ${CART_MAX_ITEM_LIMIT} reached. Please remove an item before adding a new one.`
		);
	}

	// 6. Add the new item to the cart

	try {
		await prisma.cartItem.create({
			data: {
				productId: Number(productId),
				variantId: variantId ? Number(variantId) : null,
				itemQty: 1,
				cartId: cart.id,
			},
		});
	} catch (error) {
		throw new ApiError(
			500,
			"Failed to add the product to your cart. Please try again later."
		);
	}

	const updatedCart = await getCartDetails(cart);
	// 7. Success response
	return res
		.status(201)
		.json(
			new ApiResponse(201, updatedCart, "Item added to cart successfully.")
		);
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/v1/cart/:itemId
 * @access  Private
 */
export const removeFromCart = asyncHandler(async (req, res) => {
	const { itemId } = req.params;
	const user = req.user;

	// 1. Validate user authentication
	if (!user) {
		throw new ApiError(401, "User is not authorized. Please log in.");
	}

	// 2. Validate required fields
	if (!itemId) {
		throw new ApiError(400, "Cart item ID is required.");
	}

	// 3. Find the user's cart
	const cart = await prisma.cart.findFirst({
		where: { userId: user.id },
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
		throw new ApiError(404, "Cart not found.");
	}

	// 4. Check if the item exists in the cart
	const cartItem = cart.items.find((item) => item.id === Number(itemId));
	if (!cartItem) {
		throw new ApiError(404, "Item not found in your cart.");
	}

	// 5. Remove the item from the cart
	try {
		await prisma.cartItem.delete({
			where: {
				id: Number(itemId),
			},
		});
	} catch (error) {
		throw new ApiError(
			500,
			"Failed to remove the item from your cart. Please try again later."
		);
	}

	const updatedCart = await getCartDetails(cart);

	// 6. Success response
	return res
		.status(200)
		.json(
			new ApiResponse(200, updatedCart, "Item removed from cart successfully.")
		);
});

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/v1/cart
 * @access  Private
 */
export const clearCart = asyncHandler(async (req, res) => {
	const user = req.user;

	if (!user) {
		throw new ApiError(401, "User is not authorized. Please log in.");
	}

	// Find the user's cart
	const cart = await prisma.cart.findFirst({
		where: { userId: user.id },
		include: { items: true },
	});

	if (!cart) {
		throw new ApiError(404, "Cart not found.");
	}

	try {
		// Delete all items in the cart
		await prisma.cartItem.deleteMany({
			where: { cartId: cart.id },
		});
	} catch (error) {
		throw new ApiError(
			500,
			"Failed to clear the cart. Please try again later."
		);
	}

	return res
		.status(200)
		.json(new ApiResponse(200, null, "Cart cleared successfully."));
});

/**
 * @desc    Get user's cart
 * @route   GET /api/v1/cart
 * @access  Private
 */
export const getUserCart = asyncHandler(async (req, res) => {
	const user = req.user;

	if (!user) {
		throw new ApiError(401, "User is not authorized. Please log in.");
	}

	const cart = await prisma.cart.findFirst({
		where: {
			userId: user.id,
		},
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
		throw new ApiError(404, "Cart not found.");
	}
	const updatedCart = await getCartDetails(cart);

	return res
		.status(200)
		.json(new ApiResponse(200, updatedCart, "Cart retrieved successfully."));
});

/**
 * @desc    Update item quantity in cart
 * @route   PATCH /api/v1/cart/:itemId
 * @access  Private
 */
export const updateCartItemQuantity = asyncHandler(async (req, res) => {
	const user = req.user;
	const { itemId } = req.params;
	const { quantity } = req.body;

	if (!user) {
		throw new ApiError(401, "User is not authorized. Please log in.");
	}

	if (!itemId) {
		throw new ApiError(400, "Cart item ID is required.");
	}

	const qty = Number(quantity);

	if (isNaN(qty) || qty < 1) {
		throw new ApiError(400, "Quantity must be a positive integer.");
	}

	// Find the cart item and ensure it belongs to the user
	const cartItem = await prisma.cartItem.findUnique({
		where: { id: Number(itemId) },
		include: {
			cart: true,
		},
	});

	if (!cartItem || cartItem.cart.userId !== user.id) {
		throw new ApiError(404, "Cart item not found.");
	}

	// Update the quantity
	const updatedCartItem = await prisma.cartItem.update({
		where: { id: Number(itemId) },
		data: { itemQty: qty },
	});

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				updatedCartItem,
				"Cart item quantity updated successfully."
			)
		);
});
