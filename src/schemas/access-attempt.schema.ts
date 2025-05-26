import { z } from "zod";
import { AttemptType } from "../models/access-log.model";

export const accessAttemptSchema = z.object({
    deviceId: z.string().uuid("L'identifiant du dispositif doit être un UUID valide"),
    uidRfid: z.string({
        required_error:"L'identifiant du badge est requis",
        invalid_type_error:"L'identifiant du badge invalide"
    }), // UID du badge, optionnel si attemptType est pin_seul
    pin: z.string().optional(), // PIN, optionnel si attemptType est badge_seul
    attemptType: z.nativeEnum(AttemptType, { // Le type de tentative
        required_error: "Le type de tentative est requis",
        invalid_type_error: "Type de tentative invalide",
    }),
    // Vous pourriez ajouter d'autres champs si nécessaire, ex: adresse IP du dispositif si non capturée par le backend directement
});

export type AccessAttempt = z.infer<typeof accessAttemptSchema>;
