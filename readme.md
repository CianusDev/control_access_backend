# Documentation du Backend

## Description du Projet

Ce projet est le backend d'un système de contrôle d'accès gérant les utilisateurs, les rôles, les badges RFID, les dispositifs (lecteurs/actionneurs ESP32), les journaux d'accès et les alertes.

Il fournit une API REST pour l'administration et une interface WebSocket pour la communication en temps réel avec les dispositifs.

## Technologies Utilisées

*   Node.js
*   TypeScript
*   Express.js
*   PostgreSQL (Base de données)
*   WebSocket (pour la communication avec les dispositifs)
*   Zod (pour la validation des schémas)
*   bcrypt (pour le hachage des mots de passe/PIN)
*   jsonwebtoken (pour l'authentification)

## Prérequis

*   Node.js (v14 ou supérieur recommandé)
*   PostgreSQL (v12 ou supérieur recommandé)
*   Git

## Installation

1.  Clonez le dépôt :

    ```bash
    git clone <URL_DU_DEPOT>
    cd backend
    ```

2.  Installez les dépendances :

    ```bash
    npm install
    ```

## Configuration

1.  Créez un fichier `.env` à la racine du projet en copiant le fichier `.env.example` (s'il existe, sinon créez-le manuellement) :

    ```bash
    cp .env.example .env
    ```

2.  Modifiez le fichier `.env` avec vos informations de configuration, notamment les informations de connexion à la base de données PostgreSQL et les clés secrètes.

    ```env
    # Configuration de la base de données PostgreSQL
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_HOST=localhost
    DB_PORT=5432
    DB_DATABASE=your_db_name

    # Configuration du serveur
    PORT=5000
    SECRET_KEY=your_secret_key_for_jwt
    REFRESH_SECRET_KEY=your_refresh_secret_key_for_jwt # Si utilisé

    # Configuration du Root Admin (à utiliser pour la première connexion/initialisation)
    ROOT_ADMIN_EMAIL=admin@example.com
    ROOT_ADMIN_PASSWORD=admin_password
    ```

## Base de Données

1.  Assurez-vous que votre serveur PostgreSQL est en cours d'exécution.
2.  Créez une base de données pour le projet (par exemple, `control_access_db`).
3.  Exécutez les scripts d'initialisation de la base de données :

    ```bash
    npm run db:init
    npm run db:seed # Optionnel : insère des données initiales (rôles, config)
    ```

    Ces commandes exécutent les fichiers `database.sql`, `src/scripts/db_init.ts` et `src/scripts/seeds.ts` respectivement.

## Lancer l'Application

*   Pour lancer l'application en mode développement (avec nodemon pour le rechargement à chaud) :

    ```bash
    npm run dev
    ```

*   Pour compiler et lancer l'application en production :

    ```bash
    npm run build
    npm start
    ```

L'API sera accessible à l'adresse `http://localhost:<PORT>` (où `<PORT>` est le port défini dans votre fichier `.env`, par défaut 5000).

## API Endpoints

Le backend expose une API REST pour gérer les différentes entités du système. Vous pouvez trouver la définition des endpoints dans le fichier `api.http` à la racine du projet.

Les principales routes incluent :

*   `/api/auth` : Authentification (connexion, déconnexion)
*   `/api/users` : Gestion des utilisateurs
*   `/api/roles` : Gestion des rôles
*   `/api/badges` : Gestion des badges RFID
*   `/api/devices` : Gestion des dispositifs (ESP32)
*   `/api/zones-acces` : Gestion des zones d'accès
*   `/api/permissions` : Gestion des permissions (rôles-zones)
*   `/api/access-logs` : Consultation des journaux d'accès
*   `/api/alerts` : Gestion des alertes
*   `/api/configuration` : Gestion de la configuration système

La documentation détaillée de chaque endpoint (méthodes HTTP, chemins, corps de requête, réponses) se trouve dans `api.http`.

## Structure du Projet

```
backend/
├── src/
│   ├── config/         # Configuration de la base de données, etc.
│   ├── controllers/    # Logique de traitement des requêtes API
│   ├── data/           # Fichiers de données (si nécessaire)
│   ├── middlewares/    # Middlewares Express (authentification, etc.)
│   ├── models/         # Définition des modèles de données (TypeScript)
│   ├── repositories/   # Interaction avec la base de données
│   ├── routes/         # Définition des routes API
│   ├── schemas/        # Schémas de validation (Zod)
│   ├── scripts/        # Scripts utilitaires (initialisation DB, etc.)
│   ├── services/       # Logique métier principale
│   ├── template/       # Modèles (si nécessaire)
│   └── utils/          # Fonctions utilitaires diverses
├── .env.example      # Exemple de fichier de configuration d'environnement
├── .gitignore        # Fichiers ignorés par Git
├── api.http          # Définition des requêtes API (pour clients HTTP comme Thunder Client)
├── database.sql      # Schéma de la base de données SQL
├── package-lock.json
├── package.json      # Dépendances et scripts NPM
├── readme.md         # Ce fichier
└── tsconfig.json     # Configuration TypeScript
```

## Améliorations Potentielles / TODO

*   Implémenter la création automatique d'alertes basées sur les logs d'accès (par exemple, via des triggers PostgreSQL ou un service d'analyse des logs).
*   Ajouter des tests unitaires et d'intégration.
*   Mettre en place une gestion plus robuste des erreurs et un logging centralisé.
*   Développer une documentation API interactive (Swagger/OpenAPI).
*   Sécuriser davantage les endpoints et la communication avec les dispositifs.

