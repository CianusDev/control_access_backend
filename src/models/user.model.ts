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
    created_at: Date;
    updated_at: Date;
}
