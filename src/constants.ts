export const MAX_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_DURATION = 1; // 1 day

export enum UserRolesEnum {
	ADMIN = "ADMIN",
	USER = "USER",
}

export enum StatusEnum {
	ACTIVE = "ACTIVE",
	SUSPENDED = "SUSPENDED",
	LOCKED = "LOCKED",
	BANNED = "BANNED",
	INACTIVE = "INACTIVE",
}

export enum LoginTypeEnum {
	ID_PASSWORD = "ID_PASSWORD",
	GOOGLE = "GOOGLE",
}

export const RATE_LIMIT_CONFIG = {
	GLOBAL: {
		windowMs: 60 * 1000, // 1 minute
		max: 500,
		message: "Too many requests. Your IP has been blocked for 24 hours.",
	},
	AUTH: {
		windowMs: 15 * 60 * 1000,
		max: 5,
		message: "Too many login attempts. Please try again after 15 minutes.",
	},
	MAX_FAILED_ATTEMPTS: 5,
	BLOCK_DURATION: 24, // hours
} as const;

export enum ProductStatusEnum {
	PUBLISHED = "PUBLISHED",
	UNPUBLISHED = "UNPUBLISHED",
	ARCHIVED = "ARCHIVED",
}

export const MAX_IMAGE_COUNT = 4;
export const MAX_VARIANT_COUNT = 4;

export enum PRODUCT_SIZE_ENUM {
	XS = "XS",
	S = "S",
	M = "M",
	L = "L",
	XL = "XL",
	XXL = "XXL",
	XXXL = "XXXL",
}

export const AvailableUserRoles = Object.values(UserRolesEnum);
export const AvailableStatus = Object.values(StatusEnum);
export const AvailableLoginType = Object.values(LoginTypeEnum);
export const AvailableProductStatus = Object.values(ProductStatusEnum);
export const AvailableProductSizes = Object.values(PRODUCT_SIZE_ENUM) as [
	string,
	...string[]
];
