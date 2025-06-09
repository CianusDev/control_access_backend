import { Request, Response } from "express";
import { PermissionRepository } from "../repositories/permission.repository";
import { permissionSchema } from "../schemas/permission.schema";

const permissionRepository = new PermissionRepository();

export class PermissionController {
    static async getPermissions(req: Request, res: Response) {
        try {
            const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const offset = (page - 1) * limit;
            const [permissions, total] = await Promise.all([
                permissionRepository.getPermissions(limit, offset),
                permissionRepository.countPermissions()
            ]);
            return res.status(200).json({
                message: "Permissions récupérées avec succès",
                permissions,
                pagination: { limit, page, offset, total }
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la récupération des permissions",
                error: errorMessage,
            });
        }
    }

    static async getPermission(req: Request, res: Response) {
        try {
            const permissionId = req.params.id;
            const permission = await permissionRepository.getPermission(permissionId);
            return res.status(200).json({
                message: "Permission récupérée avec succès",
                permission,
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la récupération de la permission",
                error: errorMessage,
            });
        }
    }

    static async createPermission(req: Request, res: Response) {
        try {
            const validation = permissionSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur de validation des données permission",
                    error: validation.error.flatten().fieldErrors,
                });
            }
            const permission = await permissionRepository.createPermission(validation.data);
            return res.status(201).json({
                message: "Permission créée avec succès",
                permission,
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la création de la permission",
                error: errorMessage,
            });
        }
    }

    static async updatePermission(req: Request, res: Response) {
        try {
            const permissionId = req.params.id;
            const validation = permissionSchema.partial().safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur de validation des données permission (update)",
                    error: validation.error.flatten().fieldErrors,
                });
            }
            const permission = await permissionRepository.updatePermission(permissionId, validation.data);
            return res.status(200).json({
                message: "Permission modifiée avec succès",
                permission,
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la modification de la permission",
                error: errorMessage,
            });
        }
    }

    static async deletePermission(req: Request, res: Response) {
        try {
            const permissionId = req.params.id;
            await permissionRepository.deletePermission(permissionId);
            return res.status(200).json({
                message: "Permission supprimée avec succès",
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la suppression de la permission",
                error: errorMessage,
            });
        }
    }
} 