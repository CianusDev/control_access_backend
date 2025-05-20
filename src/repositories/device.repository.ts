import { z } from "zod";
import { query } from "../config/database";
import { Device } from "../models/device.model";
import { deviceSchema } from "../schemas/device.schemat";
import { Badge } from "../models/badge.model";
import { User } from "../models/user.model";
import { Role } from "../models/role.model";

export class DeviceRepository {

    async getDevices(): Promise<Device[]|null> {
        const result = await query(
            `SELECT * FROM devices`
        );

        return result.rows as Device[];
    }

    async getDevice(id: string): Promise<Device|null> {
        const result = await query(
            `SELECT * FROM devices WHERE id = $1`,
            [id]
        );

        return result.rows[0] as Device;
    }

    async createDevice(payload: z.infer<typeof deviceSchema>): Promise<Device|null> {

        const deviceExistsResult = await query(
            `SELECT * FROM devices WHERE nom = $1`,
            [payload.nom]
        );

        const existingDevice = deviceExistsResult.rows[0];

        if (existingDevice) {
            const errorMessages: Record<string, string> = {};
            if (existingDevice.nom === payload.nom) errorMessages.nom = "Nom de device déjà utilisé";
            throw new Error(JSON.stringify(errorMessages));
        }

        const result = await query(
            `INSERT INTO devices (nom, chip_id, ip_locale, localisation, access_level) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [payload.nom, payload.chip_id, payload.ip_locale, payload.localisation, payload.access_level]
        );

        return result.rows[0] as Device;
    }

    async updateDevice(id: string, payload: z.infer<typeof deviceSchema>): Promise<Device|null> {
        const result = await query(
            `UPDATE devices SET nom = $1, chip_id = $2, ip_locale = $3, localisation = $4, access_level = $5 WHERE id = $6`,
            [payload.nom, payload.chip_id, payload.ip_locale, payload.localisation, payload.access_level, id]
        );

        return result.rows[0] as Device;
    }

    async deleteDevice(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM devices WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            throw new Error("Device not found");
        }   
    }

    async checkAccess(deviceId: string, badge_uid: string): Promise<Boolean|null>{
        const result = await query(
            `SELECT * FROM devices WHERE id = $1`,
            [deviceId]
        );

        const device = result.rows[0] as Device;

        if (!device) {
            throw new Error("Device not found");
        }

        const badgeResult = await query(
            `SELECT * FROM badges WHERE uid = $1`,
            [badge_uid]
        );

        const badge = badgeResult.rows[0] as Badge;

        if (!badge) {
            throw new Error("Badge not found");
        }

        if (badge.actif === false) {
            throw new Error("Badge is inactive");
        }
         
        const userResult = await query(
            `SELECT * FROM users WHERE id = $1`,
            [badge.user_id]
        )

        const user = userResult.rows[0] as User;


        const roleResult = await query(
            `SELECT * FROM roles WHERE id = $1`,
            [user.role_id]
        );

        const role = roleResult.rows[0] as Role;

        if(role.name === 'root'){
            return true;
        }

        if(role.name === 'admin' && device.access_level === 'admin-only'){
            return true;
        }

        if(role.name === 'security' && device.access_level === 'security-only'){
            return true;
        }

        if (role.name === 'user' && device.access_level === 'user-only'){
            return true;
        }

        return false;
    }
    
}