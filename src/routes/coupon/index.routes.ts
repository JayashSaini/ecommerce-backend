import { Router } from "express";
import {
	createCoupon,
	getAllCoupons,
	getCouponById,
	updateCoupon,
	deleteCoupon,
	applyCouponToCart,
} from "../../controllers/coupon/index.controllers.js";
import {
	verifyJWT,
	verifyPermission,
} from "../../middlewares/auth.middlewares.js";
import { UserRolesEnum } from "../../constants.js";

const router = Router();

// Authenticated Route
router.use(verifyJWT);

// Apply coupon to order
router.route("/apply").post(applyCouponToCart);

// Admin Only Routes
router.use(verifyPermission([UserRolesEnum.ADMIN]));

router.route("/").post(createCoupon).get(getAllCoupons);
router
	.route("/:id")
	.get(getCouponById)
	.patch(updateCoupon)
	.delete(deleteCoupon);

export default router;
