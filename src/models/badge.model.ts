export type Badge = {
  id: string; // UUID
  uid: string;
  user_id: string; // FK vers User.id
  actif: boolean;
  created_at: Date;
}