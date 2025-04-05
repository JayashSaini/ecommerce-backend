import { Router } from "express";
import {
	createCategory,
	updateCategory,
	deleteCategory,
	getAllCategories,
	getCategoryById,
} from "../../controllers/category/index.controllers.js";
import {
	verifyJWT,
	verifyPermission,
} from "../../middlewares/auth.middlewares.js";
import { UserRolesEnum } from "../../constants.js";

const router = Router();

// authorized endpoints
router.use(verifyJWT);

router
	.route("/")
	.get(getAllCategories)
	.post(verifyPermission([UserRolesEnum.ADMIN]), createCategory);

router
	.route("/:id")
	.get(getCategoryById)
	.patch(verifyPermission([UserRolesEnum.ADMIN]), updateCategory)
	.delete(verifyPermission([UserRolesEnum.ADMIN]), deleteCategory);

export default router;
