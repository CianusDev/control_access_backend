import { Request, Response } from 'express';
import { accessAttemptSchema } from "../schemas/access-attempt.schema";
import { AccessService } from '../services/access.service';
// Importez ici votre service ou logique de gestion d'accès
// import { AccessService } from '../services/access.service'; 

const accessService = new AccessService(); // Instanciez votre service

export class AccessController {

    /**
     * Gère une tentative d'accès reçue d'un dispositif ESP32.
     * Cet endpoint ne devrait PAS être protégé par l'authentification utilisateur standard (JWT).
     */
    static async handleAccessAttempt(req: Request, res: Response) {
        try {
            // Valider les données entrantes avec Zod
            const validation = accessAttemptSchema.safeParse(req.body);

            if (!validation.success) {
                // Données invalides - potentiellement une tentative malveillante ou un dispositif mal configuré
                console.error('❌ Données de tentative d\'accès invalides:', validation.error.flatten().fieldErrors);
                // On pourrait enregistrer un log d'erreur ici si nécessaire
                return res.status(400).json({
                    message: "Données de tentative d'accès invalides",
                    errors: validation.error.flatten().fieldErrors,
                });
            }

            const attemptData = validation.data; // Données validées

            const accessResult = await accessService.processAttempt(attemptData,req);

            console.log('Received valid access attempt:', attemptData);

            if (accessResult.granted) {
                return res.status(200).json({ message: "Accès accordé", logId: accessResult.logId });
            } else {
                return res.status(401).json({ message: "Accès refusé", reason: accessResult.reason, logId: accessResult.logId });
            }

        } catch (error) {
            console.error('❌ Erreur lors du traitement de la tentative d\'accès:', error);
            return res.status(500).json({ message: 'Erreur interne du serveur lors du traitement de la tentative d\'accès' });
        }
    }
} 