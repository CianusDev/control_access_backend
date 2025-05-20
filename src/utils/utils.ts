import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { StringValue } from 'ms';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Hashe un mot de passe en utilisant bcryptjs
 * @param password - Le mot de passe à hasher
 * @param saltRounds - Le nombre de rounds pour le salt (par défaut: 10)
 * @returns Le mot de passe hashé
 */
export const hashPassword = async (password: string, saltRounds: number = 10): Promise<string> => {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        throw new Error('Erreur lors du hashage du mot de passe');
    }
};



/**
 * Compare un mot de passe en clair avec un hash
 * @param password - Le mot de passe en clair
 * @param hashedPassword - Le hash à comparer
 * @returns true si le mot de passe correspond, false sinon
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        throw new Error('Erreur lors de la comparaison du mot de passe');
    }
};



/**
 * Crée un token JWT pour un utilisateur
 * @param userId - L'ID de l'utilisateur
 * @param secret - La clé secrète pour signer le token
 * @param expiresIn - Durée de validité du token (par défaut: '24h')
 * @returns Le token JWT généré
 */
export const createUserToken = (
    userId: string,
    secret: string,
    expiresIn: StringValue = '24h'
): string => {
    try {
        const options: SignOptions = { expiresIn };
        return jwt.sign({ userId }, secret, options);
    } catch (error) {
        throw new Error('Erreur lors de la création du token');
    }
};

/**
 * Vérifie la validité d'un token JWT
 * @param token - Le token à vérifier
 * @param secret - La clé secrète utilisée pour signer le token
 * @returns L'ID de l'utilisateur si le token est valide, sinon null
 */
export const verifyUserToken = (token: string, secret: string): string | null => {
    try {
        const decoded = jwt.verify(token, secret) as { userId: string };
        return decoded.userId;
    } catch (error) {
        return null;
    }   
}


//generer mot de passe aléatoire
export const generateRandomPassword = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 8;
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}