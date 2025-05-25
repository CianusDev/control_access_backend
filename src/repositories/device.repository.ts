import { z } from "zod";
import { query } from "../config/database";
import { Device } from "../models/device.model";
import { deviceSchema } from "../schemas/device.schemat";
import { Badge } from "../models/badge.model";
import { User } from "../models/user.model";
import { Role } from "../models/role.model";

export class DeviceRepository {

    async getDevices(limit = 20, offset = 0): Promise<Device[]> {
        const result = await query(
            `SELECT * FROM dispositifs ORDER BY id LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows as Device[];
    }

    async getDevice(id: string): Promise<Device | null> {
        const result = await query(
            `SELECT * FROM dispositifs WHERE id = $1`,
            [id]
        );
        return result.rows[0] as Device || null;
    }

    async createDevice(payload: z.infer<typeof deviceSchema>): Promise<Device> {
        // Vérification unicité MAC
        const deviceMacResult = await query(
            `SELECT * FROM dispositifs WHERE mac_address = $1`,
            [payload.mac_address]
        );
        if (deviceMacResult.rows.length > 0) {
            throw new Error("L'adresse MAC du dispositif existe déjà !");
        }
        const result = await query(
            `INSERT INTO dispositifs (nom, mac_address, ip_address, zone_acces_id, statut, version_firmware, derniere_connexion)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [payload.nom, payload.mac_address, payload.ip_address, payload.zone_acces_id, payload.statut, payload.version_firmware, payload.derniere_connexion]
        );
        return result.rows[0] as Device;
    }

    async updateDevice(id: string, payload: Partial<z.infer<typeof deviceSchema>>): Promise<Device | null> {
        const deviceExistsResult = await query(
            `SELECT * FROM dispositifs WHERE id = $1`,
            [id]
        );
        if (!deviceExistsResult.rows[0]) {
            throw new Error("Dispositif non trouvé");
        }
        const fields = [];
        const values = [];
        let idx = 1;
        for (const [key, value] of Object.entries(payload)) {
            if (value !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push(value);
                idx++;
            }
        }
        if (fields.length === 0) return deviceExistsResult.rows[0] as Device;
        values.push(id);
        const result = await query(
            `UPDATE dispositifs SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] as Device;
    }

    async deleteDevice(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM dispositifs WHERE id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            throw new Error("Dispositif non trouvé");
        }
    }

}