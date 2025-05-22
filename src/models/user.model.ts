import { Role } from "./role.model";

export type User = {
    id: string;
    username: string;
    password_hashed: string;
    email: string;
    firstname: string;
    lastname: string;
    role_id: number
    token?: string;
    is_active: boolean;
    is_deleted: boolean;
    created_at: Date;
    updated_at: Date;
}
