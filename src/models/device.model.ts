export type Device = {
  id: string; // UUID
  nom: string;
  chip_id: string;
  ip_locale: string;
  localisation: string;
  access_level: 'admin-only' | 'user-only' | 'security-only';
}