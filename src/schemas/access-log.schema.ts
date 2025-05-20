import { z } from "zod";

export const accessLogSchema = z.object({
    badge_uid: z.string({
        required_error:"badge_uid est requis",
        invalid_type_error:"badge_uid doit etre une chaine de caractere"
    }),
    device_id: z.string({
        required_error:"device_id est requis",
        invalid_type_error:"device_id doit etre une chaine de caractere"
    }),
    access_status: z.enum(['granted', 'denied']),
});