const path = require("path");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "healthifi";
const usersCollectionName = process.env.MONGODB_USERS_COLLECTION || "users";

if (!uri) {
  console.error("Missing MONGODB_URI environment variable.");
  process.exit(1);
}

const firstNames = [
  "Aarav",
  "Vihaan",
  "Arjun",
  "Ishaan",
  "Kabir",
  "Anaya",
  "Siya",
  "Myra",
  "Ira",
  "Diya",
  "Rohan",
  "Kunal",
  "Sneha",
  "Pooja",
  "Neha",
  "Aditya",
  "Rahul",
  "Nikhil",
  "Priya",
  "Aisha",
  "Meera",
  "Ankit",
  "Siddharth",
  "Kriti",
  "Tanvi",
];

const lastNames = [
  "Sharma",
  "Verma",
  "Patel",
  "Singh",
  "Gupta",
  "Iyer",
  "Reddy",
  "Nair",
  "Mehta",
  "Joshi",
];

const goals = [
  "Lose 1-10 kg for good",
  "Improve energy levels",
  "Better sleep quality",
  "Reduce stress and anxiety",
  "Build healthy routines",
];

const activityLevels = [
  "Sedentary",
  "Lightly active",
  "Moderately active",
  "Very active",
];

const wellbeingFocus = [
  ["Mood", "Sleep"],
  ["Energy", "Productivity"],
  ["Anxiety", "Focus"],
  ["Relationships", "Stress"],
  ["Weight", "Discipline"],
];

function randomFrom(list, indexOffset) {
  return list[indexOffset % list.length];
}

function createAnswers(index) {
  const height = 150 + (index % 25);
  const weight = 50 + (index % 30);
  const mobile = `9${String(100000000 + index * 377).padStart(9, "0")}`;

  return [
    {
      key: "name",
      question: "What is your name?",
      answer: `${randomFrom(firstNames, index)} ${randomFrom(lastNames, index * 3)}`,
    },
    {
      key: "age",
      question: "How old are you?",
      answer: String(24 + (index % 27)),
    },
    {
      key: "height_cm",
      question: "What is your height (cm)?",
      answer: String(height),
    },
    {
      key: "weight_kg",
      question: "What is your current weight (kg)?",
      answer: String(weight),
    },
    {
      key: "health_goal",
      question: "What is your primary health goal?",
      answer: randomFrom(goals, index),
    },
    {
      key: "activity_level",
      question: "What's your typical activity level?",
      answer: randomFrom(activityLevels, index * 2),
    },
    {
      key: "wellbeing_focus",
      question: "Which aspects of your wellbeing would you like to improve?",
      answer: randomFrom(wellbeingFocus, index).join(", "),
    },
    {
      key: "email",
      question: "What's your email address?",
      answer: `mock.user${String(index + 1).padStart(2, "0")}@dpht.local`,
    },
    {
      key: "phone",
      question: "What's your mobile phone number?",
      answer: mobile,
    },
  ];
}

function createSubmission(index, submissionIndex) {
  const submittedAt = new Date(
    Date.now() - (index * 2 + submissionIndex) * 86400000,
  );
  return {
    questionnaireSlug: "master-wellness-questionnaire",
    questionnaireTitle: "DIVINE POWER HOLISTIC THERAPY (DPHT)",
    submittedAt,
    timestamp: submittedAt.toISOString(),
    answers: createAnswers(index + submissionIndex),
  };
}

function createMockUser(index) {
  const fullName = `${randomFrom(firstNames, index)} ${randomFrom(lastNames, index * 3)}`;
  const email = `mock.user${String(index + 1).padStart(2, "0")}@dpht.local`;
  const createdAt = new Date(Date.now() - (35 + index) * 86400000);
  const submissionCount = 1 + (index % 3);
  const responses = Array.from(
    { length: submissionCount },
    (_, submissionIndex) => createSubmission(index, submissionIndex),
  );

  return {
    email,
    fullName,
    phone: `+91${`9${String(100000000 + index * 377).padStart(9, "0")}`}`,
    createdAt,
    updatedAt: new Date(),
    responses,
  };
}

async function seedMockUsers() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection(usersCollectionName);

    await users.createIndex({ email: 1 }, { unique: true });

    const total = 25;
    let upserted = 0;

    for (let index = 0; index < total; index += 1) {
      const mockUser = createMockUser(index);

      await users.updateOne(
        { email: mockUser.email },
        {
          $set: {
            fullName: mockUser.fullName,
            phone: mockUser.phone,
            updatedAt: mockUser.updatedAt,
            responses: mockUser.responses,
          },
          $setOnInsert: {
            createdAt: mockUser.createdAt,
          },
        },
        { upsert: true },
      );

      upserted += 1;
    }

    console.log(
      `Seeded ${upserted} mock user(s) into ${dbName}.${usersCollectionName}`,
    );
  } catch (error) {
    console.error("Failed to seed mock users:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedMockUsers();
