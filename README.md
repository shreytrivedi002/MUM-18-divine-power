# HealthiFi

A mobile-first Next.js website for a cortisol detox questionnaire built with direct MongoDB Atlas integration.

## Features

- Next.js with app router
- SEO metadata and Open Graph support
- Mobile-first landing page
- Server-side MongoDB Atlas integration with API routes

## Setup

1. Install dependencies

```bash
npm install
```

2. Copy environment file

```bash
cp .env.local.example .env.local
```

3. Configure MongoDB Atlas

- Create an Atlas cluster and a database user.
- Open Atlas Data Explorer and create a database named `healthifi`.
- Create `responses` and `questionnaires` collections in that database.
- Set `MONGODB_URI`, `MONGODB_DB_NAME`, `MONGODB_RESPONSES_COLLECTION`, and `MONGODB_QUESTIONNAIRE_COLLECTION` in `.env.local`.

Example `.env.local`:

```dotenv
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/healthifi?retryWrites=true&w=majority
MONGODB_DB_NAME=healthifi
MONGODB_RESPONSES_COLLECTION=responses
MONGODB_QUESTIONNAIRE_COLLECTION=questionnaires
```

4. Seed questionnaire definitions

- Edit `scripts/questionnaires.json` with your questionnaire definitions and possible responses.
- Run:

```bash
npm run seed:questionnaires
```

This will upsert the questionnaire documents into the `questionnaires` collection.

5. Run dev server

```bash
npm run dev
```

## Notes

- This sample uses server-side API routes to connect to MongoDB Atlas.
- Keep `MONGODB_URI` secret and do not expose it to browser-side code.
- The client fetches questionnaires through `/api/questionnaires` and submits responses through `/api/submit`.
