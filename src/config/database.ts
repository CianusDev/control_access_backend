import { Pool, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Vérification de la présence des variables d'environnement
if (!process.env.DB_USER || !process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_PASSWORD || !process.env.DB_PORT) {
    throw new Error('Missing environment variables for database connection');
}

// Création d'une instance de Pool pour la connexion à la base de données
// La classe Pool gère un pool de connexions à la base de données
export const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
});

// Fonction pour exécuter une requête SQL
// Elle prend en paramètre une chaîne de caractères (text) et un tableau de paramètres (params)
export async function query<T extends QueryResultRow>(
    text:string,
    params?:unknown[]
):Promise<QueryResult<T>>{
    return pool.query<T>(text, params)
}