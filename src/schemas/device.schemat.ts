import { z } from "zod";
import { AccessLevel } from "../models/device.model";

export const deviceSchema = z.object({
    nom: z.string({
        message: 'Le nom du device est obligatoire',
        required_error: 'Le nom du device est obligatoire',
    })
    .trim(),
    chip_id: z.string({
        message: 'Le chip_id du device est obligatoire',
        required_error: 'Le chip_id du device est obligatoire',
    }),
    ip_locale: z.string({
        message: 'L\'ip_locale du device est obligatoire',
        required_error: 'L\'ip_locale du device est obligatoire',
    })
    .trim(),
    localisation: z.string({
        message: 'La localisation du device est obligatoire',
        required_error: 'La localisation du device est obligatoire',
    })
    .trim(),
    access_level: z.enum([
        AccessLevel.admin,
        AccessLevel.user,
        AccessLevel.security,
        AccessLevel.all
    ],{
        message: 'L\'access_level du device est obligatoire',
        required_error: 'L\'access_level du device est obligatoire',
    })
    .optional()
    .default(AccessLevel.all),
});