
export type Alert = {
    id: string;
    user_id: string;
    device_id: string;
    message: string;
    is_deleted: boolean;
    level: AlertLevel;
    created_at: Date;
};


export enum AlertLevel {
    info = 'info',
    warning = 'warning',
    critical = 'critical',
}