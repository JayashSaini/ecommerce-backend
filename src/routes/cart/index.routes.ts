import { Router } from "express";

import { verifyJWT } from "../../middlewares/auth.middlewares.js";
import {
	addToCart,
	clearCart,
	getUserCart,
	removeFromCart,
	updateCartItemQuantity,
} from "../../controllers/cart/index.controllers.js";

const router = Router();

// authenticated route
router.use(verifyJWT);

router.route("/").post(addToCart).get(getUserCart).delete(clearCart);

router.route("/:itemId").delete(removeFromCart).patch(updateCartItemQuantity);

export default router;
