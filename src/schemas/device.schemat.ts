import { z } from "zod";
import { DeviceStatus, DeviceType } from "../models/device.model";

export const deviceSchema = z.object({
    id: z.string({
        required_error: "L'ID du dispositif est requis",
        invalid_type_error: "L'ID doit être une chaîne de caractères"
    }).optional(),
    device_id:z.string({
        required_error: "L'ID du dispositif est requis",
        invalid_type_error: "L'ID doit être une chaîne de caractères"
    }).min(2),
    nom: z.string({
        required_error: "Le nom du dispositif est requis",
        invalid_type_error: "Le nom doit être une chaîne de caractères"
    }).min(2),
    mac_address: z.string({
        required_error: "L'adresse MAC est requise",
        invalid_type_error: "L'adresse MAC doit être une chaîne de caractères"
    }),
    ip_address: z.string().optional(),
    zone_acces_id: z.string({
        required_error: "L'identifiant de la zone d'accès est requis",
        invalid_type_error: "La zone d'accès doit être une chaine de caractere"
    }),
    statut: z.nativeEnum(DeviceStatus),
    version_firmware: z.string().optional(),
    derniere_connexion: z.coerce.date().optional(),
    type: z.nativeEnum(DeviceType).default(DeviceType.client).optional(),
});

