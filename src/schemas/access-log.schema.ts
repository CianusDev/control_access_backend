import { z } from "zod";
import { AccessStatus } from "../models/access-log.model";



export const accessLogSchema = z.object({
    badge_uid: z.string({
        required_error:"badge_uid est requis",
        invalid_type_error:"badge_uid doit etre une chaine de caractere"
    }),
    device_id: z.string({
        required_error:"device_id est requis",
        invalid_type_error:"device_id doit etre une chaine de caractere"
    }),
    access_status: z.enum([
        AccessStatus.granted,
        AccessStatus.denied,
    ],{
        message: 'L\'access_status du device est obligatoire',
        required_error: 'L\'access_status du device est obligatoire',
    })
    .default(AccessStatus.denied),
});