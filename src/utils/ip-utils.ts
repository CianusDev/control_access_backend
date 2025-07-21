import { Request } from 'express';

/**
 * Récupère l'adresse IP réelle du client en tenant compte des proxies
 * @param req - L'objet Request d'Express
 * @returns L'adresse IP du client
 */
export function getClientIP(req: Request): string {
    // Essayer plusieurs en-têtes pour récupérer l'IP réelle
    const ip = req.headers['x-forwarded-for'] as string ||
              req.headers['x-real-ip'] as string ||
              req.headers['x-client-ip'] as string ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.ip ||
              '127.0.0.1';
    
    // Si c'est une liste d'IPs (x-forwarded-for), prendre la première
    const cleanIP = ip.split(',')[0].trim();
    
    // Convertir les adresses IPv6 localhost en IPv4
    if (cleanIP === '::1' || cleanIP === '::ffff:127.0.0.1') {
        return '127.0.0.1';
    }
    
    return cleanIP;
} 