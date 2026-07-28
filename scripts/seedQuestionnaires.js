require("dotenv").config();
const { MongoClient } = require("mongodb");
const questionnaires = require("./questionnaires.json");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "healthifi";
const collectionName =
  process.env.MONGODB_QUESTIONNAIRE_COLLECTION || "questionnaires";

if (!uri) {
  console.error("Missing MONGODB_URI environment variable.");
  process.exit(1);
}

async function seed() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    if (!Array.isArray(questionnaires) || questionnaires.length === 0) {
      console.error(
        "No questionnaires found in scripts/questionnaires.json. Add at least one questionnaire object.",
      );
      process.exit(1);
    }

    let inserted = 0;
    for (const questionnaire of questionnaires) {
      if (!questionnaire.slug) {
        console.warn("Skipping questionnaire without slug:", questionnaire);
        continue;
      }

      const safeQuestionnaire = { ...questionnaire };
      delete safeQuestionnaire._id;

      await collection.updateOne(
        { slug: questionnaire.slug },
        { $set: safeQuestionnaire },
        { upsert: true },
      );
      inserted += 1;
    }

    console.log(
      `Seeded ${inserted} questionnaire(s) into ${dbName}.${collectionName}`,
    );
  } catch (error) {
    console.error("Failed to seed questionnaires:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
