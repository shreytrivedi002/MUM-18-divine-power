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
    name: "Testing Plan",
    details: "1 Rs test payment",
    description: "Temporary low-value plan for Razorpay integration testing.",
    durationWeeks: 1,
    costInr: 1,
    isActive: true,
    sortOrder: -999,
  },
  {
    name: "Starter Wellness",
    details: "Basic wellness support",
    description: "Entry-level plan for functional testing of plan selection.",
    durationWeeks: 4,
    costInr: 499,
    isActive: true,
    sortOrder: 10,
  },
];

async function seedMockPlans() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const plansCollection = db.collection(plansCollectionName);

    await plansCollection.createIndex(
      { name: 1, details: 1 },
      { unique: true },
    );

    let upserted = 0;
    for (const plan of plans) {
      const now = new Date();
      const result = await plansCollection.updateOne(
        { name: plan.name, details: plan.details },
        {
          $set: {
            ...plan,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true },
      );

      if (result.upsertedId) {
        upserted += 1;
      }
    }

    const testPlan = await plansCollection.findOne({
      name: "Testing Plan",
      details: "1 Rs test payment",
    });

    console.log(
      `Seeded/updated ${plans.length} plan(s) in ${dbName}.${plansCollectionName}. New inserts: ${upserted}.`,
    );
    if (testPlan) {
      console.log(
        `Testing plan id: ${String(testPlan._id)} | amount: INR ${testPlan.costInr}`,
      );
    }
  } catch (error) {
    console.error("Failed to seed mock plans:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedMockPlans();
