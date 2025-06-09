import { Request, Response } from "express";
import { DeviceRepository } from "../repositories/device.repository";
import { deviceSchema } from "../schemas/device.schemat";
const deviceRepository = new DeviceRepository();


export class DeviceController {

    static async getDevices(req: Request, res: Response) {
        try {
            const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const offset = (page - 1) * limit;
            const [devices, total] = await Promise.all([
                deviceRepository.getDevices(limit, offset),
                deviceRepository.countDevices()
            ]);

            if (devices === null) {
                res.status(500).json({ message: 'Erreur serveur' });
            } else {
                res.status(200).json({
                    message: "Dispositifs récupérés avec succès",
                    devices,
                    pagination: { limit, page, offset, total }
                });
            }
        } catch (error) {
            if (error instanceof Error) {
                let errorMessage;
                try {
                    errorMessage = JSON.parse(error.message);
                } catch {
                    errorMessage = error.message;
                }

                return res.status(400).json({
                    message: "Erreur lors de la récupération des devices",
                    error: errorMessage,
                });
            }   
        }
    }

    static async getDevice(req: Request, res: Response) {
        try {
        const device = await deviceRepository.getDevice(req.params.id);

        if (device === null) {
            res.status(404).json({ message: 'Device not found' });
        } else {
            res.status(200).json({
                device
            });
        }
        } catch (error) {
            if (error instanceof Error) {
                let errorMessage;
                try {
                    errorMessage = JSON.parse(error.message);
                } catch {
                    errorMessage = error.message;
                }

                return res.status(400).json({
                    message: "Erreur lors de la récupération du device",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }   
    }

    static async createDevice(req: Request, res: Response) {
        try {
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
                res.status(201).json({
                    message:"Device créé avec succès",
                    device
                });
            }
            
        }catch(error){
            if (error instanceof Error) {
                let errorMessage;
                try {
                    errorMessage = JSON.parse(error.message);
                } catch {
                    errorMessage = error.message;
                }       
                return res.status(400).json({
                    message: "Erreur lors de la creation du device",
                    error: errorMessage,
                });
            }
            return res.status(500).json({
                message: "Erreur interne du serveur",
            });  
        }
    }

    static async updateDevice(req: Request, res: Response) {
        try {
            const deviceId = req.params.id;
            const body = req.body 
            const validation = deviceSchema.partial().safeParse(body);
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
        try {
            await deviceRepository.deleteDevice(req.params.id);
            res.status(204).json({ message: 'Device deleted' });
        } catch (error) {
            if (error instanceof Error) {
                let errorMessage;
                try {
                    errorMessage = JSON.parse(error.message);
                } catch {
                    errorMessage = error.message;
                }

                return res.status(400).json({
                    message: "Erreur lors de la suppression du device",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }



}               