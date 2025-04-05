import { StatusEnum, UserRolesEnum } from "../constants";

export interface authPayload {
	id: number;
	email: string;
	status: StatusEnum;
	role: UserRolesEnum;
	sessionId: string;
}

export interface Email {
	to: string;
	subject: string;
	templateId: string;
	data: {};
}

export interface ProductImage {
	url: string;
	key: string;
}
