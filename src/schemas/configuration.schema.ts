import { z } from "zod";
import { ConfigDataType } from "../models/configuration.model";

export const configurationSchema = z.object({
    cle: z.string({
        required_error: "La clé est requise",
        invalid_type_error: "La clé doit être une chaîne de caractères"
    }),
    valeur: z.string({
        required_error: "La valeur est requise",
        invalid_type_error: "La valeur doit être une chaîne de caractères"
    }),
    description: z.string().optional(),
    type_donnee: z.nativeEnum(ConfigDataType).default(ConfigDataType.string),
}); 