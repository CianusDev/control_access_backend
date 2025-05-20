export type AccessLog = {
  id: string; // UUID
  badge_uid: string; // UID RFID
  device_id: string; // FK vers Device.id
  access_status: 'granted' | 'denied';
  timestamp: Date;
}
