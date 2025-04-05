import { Router } from "express";
import {
	createProduct,
	deleteProduct,
	getAllProducts,
	updateProduct,
	getProductById,
	deleteProductImage,
} from "../../controllers/product/index.controllers.js";
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

router
	.route("/")
	.get(getAllProducts)
	.post(
		upload.array("images", MAX_IMAGE_COUNT), // Allows up to 5 images
		verifyPermission([UserRolesEnum.ADMIN]),
		createProduct,
		handleUploadError
	);

router
	.route("/:id")
	.get(getProductById)
	.patch(verifyPermission([UserRolesEnum.ADMIN]), updateProduct)
	.delete(verifyPermission([UserRolesEnum.ADMIN]), deleteProduct);

router
	.route("/:id/:imageKey")
	.delete(verifyPermission([UserRolesEnum.ADMIN]), deleteProductImage);

export default router;
