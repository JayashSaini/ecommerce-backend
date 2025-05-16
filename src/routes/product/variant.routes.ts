import { Router } from "express";
import {
	createVariant,
	deleteVariant,
	deleteVariantImage,
	getVariantById,
	getVariantsByProductId,
	updateVariant,
	updateVariantImageOrder,
	uploadVariantImage,
} from "../../controllers/product/variant.controllers.js";
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
	.patch(verifyPermission([UserRolesEnum.ADMIN]), updateVariant);

router.route("/delete/:variantId").delete(
	(req, res, next) => {
		console.log("Delete variant route hit");
		console.log("req.params : ", req.params);
		console.log("req.method : ", req.method);
		console.log("req.path : ", req.path);
		next();
	},
	verifyPermission([UserRolesEnum.ADMIN]),
	deleteVariant
);

router
	.route("/:variantId/:imageKey")
	.delete(verifyPermission([UserRolesEnum.ADMIN]), deleteVariantImage);

router.route("/product/:productId").get(getVariantsByProductId);

router
	.route("/:id/image")
	.post(
		upload.single("image"),
		verifyPermission([UserRolesEnum.ADMIN]),
		uploadVariantImage,
		handleUploadError
	)
	.patch(verifyPermission([UserRolesEnum.ADMIN]), updateVariantImageOrder);

export default router;
