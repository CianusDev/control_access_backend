import { Request, Response } from "express";
import { DeviceRepository } from "../repositories/device.repository";
import { deviceSchema } from "../schemas/device.schemat";
const deviceRepository = new DeviceRepository();


export class DeviceController {

    static async getDevices(req: Request, res: Response) {
        const devices = await deviceRepository.getDevices();

        if (devices === null) {
            res.status(500).json({ message: 'Erreur serveur' });
        } else {
            res.status(200).json(devices);
        }
    }

    static async getDevice(req: Request, res: Response) {
        const device = await deviceRepository.getDevice(req.params.id);

        if (device === null) {
            res.status(404).json({ message: 'Device not found' });
        } else {
            res.status(200).json(device);
        }
    }

    static async createDevice(req: Request, res: Response) {
        const body = req.body 
        const validation = deviceSchema.safeParse(body);

        if (!validation.success) {
            return res.status(400).json({
                message: "Erreur lors de la validation du device",
                error: validation.error.flatten().fieldErrors,
            });
        }   

        const device = await deviceRepository.createDevice(validation.data);

        if (device === null) {
            res.status(500).json({ message: 'Erreur serveur' });
        } else {
            res.status(201).json(device);
        }
    }

    static async updateDevice(req: Request, res: Response) {
        try {
            const deviceId = req.params.id;
            const body = req.body 
            const validation = deviceSchema.safeParse(body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur lors de la validation du device",
                    error: validation.error.flatten().fieldErrors,
                });
            }   
            const device = await deviceRepository.updateDevice(deviceId, validation.data);
            return res.status(200).json({
                message: "Device modifié avec succès",
                device,
            });
        } catch (error) {
            if (error instanceof Error) {
                let errorMessage;
                try {
                    errorMessage = JSON.parse(error.message);
                } catch {
                    errorMessage = error.message;
                }       
                return res.status(400).json({
                    message: "Erreur lors de la modification du device",
                    error: errorMessage,
                });
            }
            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async deleteDevice(req: Request, res: Response) {
        await deviceRepository.deleteDevice(req.params.id);
        res.status(204).json({ message: 'Device deleted' });
    }

    static async checkAccess(req: Request, res: Response) {
        try {
            const deviceId = req.params.id;
            const badge_uid = req.params.badge_uid;
            const access = await deviceRepository.checkAccess(deviceId, badge_uid);
            return res.status(200).json({
                message: "Access checked",
                access,
            });
        } catch (error) {
            if (error instanceof Error) {
                let errorMessage;
                try {
                    errorMessage = JSON.parse(error.message);
                } catch {
                    errorMessage = error.message;
                }

                return res.status(400).json({
                    message: "Erreur lors de la vérification de l'accès",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

}               