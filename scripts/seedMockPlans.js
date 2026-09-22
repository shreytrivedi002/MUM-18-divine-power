const path = require("path");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "healthifi";
const plansCollectionName = process.env.MONGODB_PLANS_COLLECTION || "plans";

if (!uri) {
  console.error("Missing MONGODB_URI environment variable.");
  process.exit(1);
}

const plans = [
  {
    name: "1 Week Trial Plan",
    details: "Your Testing Transformation Journey",
    description:
      "Trial of 1 week to make you feel comfortable with your DPHT plan.\n\nIntroductory plan to begin your DPHT journey.",
    durationWeeks: 1,
    costInr: 1000,
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "4 Weeks Plan",
    details:
      "Visible improvement in Symptoms:\n- Anxiety\n- Fatigue\n- Sleep Pattern",
    description: "Focused support for visible improvement in 4 weeks.",
    durationWeeks: 4,
    costInr: 3000,
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "12 Weeks Plan",
    details:
      "Consistent Improvement In Recovery\n- Withdrawal Of Symptoms Beings\n- Improvement In Health\n- Enhanced\n- Efficiency",
    description: "Structured progression for consistency and momentum.",
    durationWeeks: 12,
    costInr: 8000,
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "25 Weeks Plan",
    details:
      "Reversal Of Symptoms\n- Restored Efficiency\n- Health Restored\n- Symptoms Vanished",
    description:
      "Live a healthy and energetic life. As a precaution against possible recurrence in some cases, continue with a comprehensive long-term plan.",
    durationWeeks: 25,
    costInr: 15000,
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "52 Weeks Plan",
    details:
      "Completely Healthy:\n- Boosted Health\n- Confidence Regained\n- Enjoy Lifelong Wellness",
    description: "Longer care cycle aimed at deeper symptom reversal.",
    durationWeeks: 52,
    costInr: 30000,
    isActive: true,
    sortOrder: 5,
  },
];

async function seedMockPlans() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const plansCollection = db.collection(plansCollectionName);

    const deleteResult = await plansCollection.deleteMany({});
    console.log(
      `Removed ${deleteResult.deletedCount} old plan(s) from ${dbName}.${plansCollectionName}.`,
    );

    for (const plan of plans) {
      const now = new Date();
      await plansCollection.insertOne({
        ...plan,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(
      `Inserted ${plans.length} DPHT plan(s) into ${dbName}.${plansCollectionName}.`,
    );
  } catch (error) {
    console.error("Failed to seed mock plans:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedMockPlans();
