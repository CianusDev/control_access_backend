import { Request, Response } from "express";
import { DeviceRepository } from "../repositories/device.repository";
import { deviceSchema } from "../schemas/device.schemat";
const deviceRepository = new DeviceRepository();


export class DeviceController {

    static async getDevices(req: Request, res: Response) {
        try {
            const devices = await deviceRepository.getDevices();

            if (devices === null) {
                res.status(500).json({ message: 'Erreur serveur' });
            } else {
                res.status(200).json({
                    message:"Devices récupérés avec succès",
                    devices
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
            res.status(200).json(device);
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

    static async updateDeletedDevice(req: Request, res: Response) {
        try {
            const deviceId = req.params.id;
            await deviceRepository.updateDeletedDevice(deviceId);
            return res.status(200).json({
                message: "Device supprimé avec succès",
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