import { ProductImage } from "../types/index.js";
import { deleteImageFromS3 } from "../utils/s3.js";
import { prisma } from "../db/index.js";

export const deleteProductsVariantsService = async (productId: number) => {
	const variants = await prisma.productVariant.findMany({
		where: {
			productId: Number(productId),
		},
	});

	variants.forEach(async (variant) => {
		await deleteVariantService(variant);
	});
};

export const deleteVariantService = async (variant: any) => {
	if (!variant || !variant.id) {
		throw new Error("Invalid variant object or missing variant id");
	}

	const variantImages = variant.images as unknown as ProductImage[];

	// Ensure `variantImages` is an array before proceeding
	if (Array.isArray(variantImages)) {
		await Promise.all(
			variantImages.map(async (image) => {
				if (image && image.key) {
					await deleteImageFromS3(image.key);
				}
			})
		);
	}

	await prisma.productVariant.delete({
		where: { id: Number(variant.id) },
	});

	return true;
};
