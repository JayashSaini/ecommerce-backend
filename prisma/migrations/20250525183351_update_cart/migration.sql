-- CreateTable
CREATE TABLE "CartCoupon" (
    "cartId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,

    CONSTRAINT "CartCoupon_pkey" PRIMARY KEY ("cartId","couponId")
);

-- AddForeignKey
ALTER TABLE "CartCoupon" ADD CONSTRAINT "CartCoupon_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartCoupon" ADD CONSTRAINT "CartCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
