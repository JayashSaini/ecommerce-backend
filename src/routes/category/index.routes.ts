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

router
	.route("/")
	.get(getAllCategories)
	.post(verifyJWT, verifyPermission([UserRolesEnum.ADMIN]), createCategory);

router
	.route("/:id")
	.get(getCategoryById)
	.patch(verifyJWT, verifyPermission([UserRolesEnum.ADMIN]), updateCategory)
	.delete(verifyJWT, verifyPermission([UserRolesEnum.ADMIN]), deleteCategory);

export default router;
