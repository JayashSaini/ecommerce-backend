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
	const variantImages = variant.images as unknown as ProductImage[];

	// Ensure `variantImages` is an array before proceeding
	if (Array.isArray(variantImages)) {
		await Promise.all(
			variantImages.map(async (image) => {
				await deleteImageFromS3(image.key);
			})
		);
	}

	await prisma.productVariant.delete({
		where: { id: Number(variant.id) },
	});

	return true;
};
