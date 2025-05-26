import { Request, Response } from "express";
import { RoleRepository } from "../repositories/role.repository";
import { roleSchema, updateRoleSchema } from "../schemas/role.schema";


const roleRepository = new RoleRepository(); 

export class RoleController {
    
    static async getRoles(req: Request, res: Response) {
        try {
            const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const offset = (page - 1) * limit;
            const roles = await roleRepository.getRoles(limit, offset);
            return res.status(200).json({
                message: "Rôles récupérés avec succès",
                roles,
                pagination: { limit, page, offset }
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
                    message: "Erreur lors de la récupération des roles",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }   

    static async getRole(req: Request, res: Response) {
        try {
            const roleId = req.params.id;
            const role = await roleRepository.getRole(roleId);
            return res.status(200).json({
                message: "Role récupéré avec succès",
                role,
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
                    message: "Erreur lors de la récupération du role",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }   

    static async createRole(req: Request, res: Response) {
        try {
            const body = req.body 
            const validation = roleSchema.safeParse(body);

            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur lors de la validation du role",
                    error: validation.error.flatten().fieldErrors,
                });
            }

            const role = await roleRepository.createRole(validation.data);
            return res.status(201).json({
                message: "Role créé avec succès",
                role,
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
                    message: "Erreur lors de la création du role",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async updateRole(req: Request, res: Response) {
        try {
            const roleId = req.params.id;
            const body = req.body 
            const validation = roleSchema.partial().safeParse(body);
            
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur lors de la validation du role",
                    error: validation.error.flatten().fieldErrors,
                });
            }

            const role = await roleRepository.updateRole(roleId, validation.data);
            return res.status(200).json({
                message: "Role modifié avec succès",
                role,
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
                    message: "Erreur lors de la modification du role",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async deleteRole(req: Request, res: Response) {
        try {
            const roleId = req.params.id;
            await roleRepository.deleteRole(roleId);
            return res.status(200).json({
                message: "Role supprimé avec succès",
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
                    message: "Erreur lors de la suppression du role",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }   
}