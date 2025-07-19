import { Coupon } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/index.js";

type CartItemWithProductAndVariant = Prisma.CartItemGetPayload<{
	include: {
		product: true;
		variant: true;
	};
}>;

type CartDetails = Prisma.CartGetPayload<{
	include: {
		items: {
			include: {
				product: true;
				variant: true;
			};
		};
		coupons: true;
	};
}>;

export async function calculateCartTotal(
	cartItems: CartItemWithProductAndVariant[],
	coupon?: Coupon
): Promise<{
	subtotal?: Decimal;
	discountAmount?: Decimal;
	total: Decimal;
}> {
	const subtotal = cartItems.reduce((acc, item) => {
		const basePrice = new Decimal(item.product.basePrice);
		const variantPrice = item.variant?.additionalPrice
			? new Decimal(item.variant.additionalPrice)
			: new Decimal(0);

		const itemTotal = basePrice.plus(variantPrice).times(item.itemQty);
		return acc.plus(itemTotal);
	}, new Decimal(0));

	if (coupon?.discount) {
		const discountAmount = subtotal.mul(coupon.discount).div(100);
		const total = subtotal.minus(discountAmount);
		return {
			subtotal,
			discountAmount,
			total,
		};
	}

	return {
		total: subtotal,
	};
}

export async function getCartDetails(cart: CartDetails) {
	if (cart.coupons.length > 0) {
		const coupon = await prisma.coupon.findFirst({
			where: { id: cart.coupons[0].couponId },
		});
		if (coupon) {
			const amount = await calculateCartTotal(cart.items, coupon);
			return {
				cart,
				...amount,
			};
		}
	}
	const amount = await calculateCartTotal(cart.items);
	return { cart, ...amount };
}
