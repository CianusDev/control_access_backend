export type AccessLog = {
  id: string; // UUID
  badge_uid: string; // UID RFID
  device_id: string; // FK vers Device.id
  access_status: AccessStatus;
  is_deleted : boolean;
  timestamp: Date;
}


export enum AccessStatus {
  granted = 'granted',
  denied = 'denied',
}