export interface Role {
  id: string; // UUID
  name:'root' |'admin' | 'security' | 'user';
}