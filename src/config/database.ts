import { Pool, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Construire dynamiquement l'URL de connexion si elle n'est pas fournie
const {
  DATABASE_URL,
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  NODE_ENV,
} = process.env;

if (
  !DATABASE_URL &&
  (!DB_USER || !DB_PASSWORD || !DB_HOST || !DB_PORT || !DB_NAME)
) {
  throw new Error('Missing required environment variables for database connection');
}

// Si l'URL n'existe pas, on la construit à partir des variables séparées
const connectionString =
  DATABASE_URL ||
  `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

// Pool de connexion avec gestion conditionnelle du SSL
export const pool = new Pool({
  connectionString: connectionString + (NODE_ENV === 'production' ? '?sslmode=require' : ''),
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Fonction générique pour exécuter une requête SQL
export async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}
