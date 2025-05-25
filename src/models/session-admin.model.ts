export type SessionAdmin = {
    id: string;
    utilisateur_id: string;
    adresse_ip?: string;
    user_agent?: string;
    expires_at: Date;
    created_at: Date;
} 