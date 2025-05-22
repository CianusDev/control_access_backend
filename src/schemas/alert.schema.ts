import { z } from "zod";
import { AlertLevel } from "../models/alert.model";

export const alertSchema = z.object({
    user_id: z.string({
        required_error:"l'id de l'utilisateur est requis",
        invalid_type_error:"l'id de l'utilisateur doit etre une chaine de caractere"
    })
    .trim(),
    device_id: z.string({
        required_error:"l'id de l'appareil est requis",
        invalid_type_error:"l'id de l'appareil doit etre une chaine de caractere"
    })
    .trim(),
    message: z.string({
        required_error:"le message est requis",
        invalid_type_error:"le message doit etre une chaine de caractere"
    }),
    is_deleted: 
    z.boolean()
    .default(false)
    .optional(),
    level: z.enum([AlertLevel.info, AlertLevel.warning, AlertLevel.critical], {
        message: 'Le niveau de l\'alerte est obligatoire',
        required_error: 'Le niveau de l\'alerte est obligatoire',
    })
    .default(AlertLevel.info),
    created_at: z.date(),
});