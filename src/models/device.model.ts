export type Device = {
  id: string; // UUID
  nom: string;
  chip_id: string;
  ip_locale: string;
  localisation: string;
  access_level: AccessLevel;
  is_deleted: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export enum AccessLevel {
  admin = 'admin-only',
  user = 'user-only',
  security = 'security-only',
  all = 'all',
}