import { Router } from "express";
import {
	createVariant,
	deleteVariant,
	deleteVariantImage,
	getVariantById,
	getVariantsByProductId,
	updateVariant,
} from "../../controllers/product/varient.controllers.js";
import {
	verifyJWT,
	verifyPermission,
} from "../../middlewares/auth.middlewares.js";
import { MAX_IMAGE_COUNT, UserRolesEnum } from "../../constants.js";
import {
	handleUploadError,
	upload,
} from "../../middlewares/multer.middleware.js";

const router = Router();

// authorized endpoints
router.use(verifyJWT);

router.route("/").post(
	upload.array("images", MAX_IMAGE_COUNT), // Allows up to 5 images
	verifyPermission([UserRolesEnum.ADMIN]),
	createVariant,
	handleUploadError
);

router
	.route("/:variantId")
	.get(getVariantById)
	.patch(verifyPermission([UserRolesEnum.ADMIN]), updateVariant)
	.delete(verifyPermission([UserRolesEnum.ADMIN]), deleteVariant);

router
	.route("/:variantId/:imageKey")
	.delete(verifyPermission([UserRolesEnum.ADMIN]), deleteVariantImage);

router.route("/product/:productId").get(getVariantsByProductId);

export default router;
