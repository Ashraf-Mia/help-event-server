import express from "express";
import "dotenv/config";
import { MongoClient } from "mongodb";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const mongoClient = await connectToMongoDB();
const db = mongoClient.db("help-events");
const eventCollection = db.collection("events");

const verifyApi = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader !== "user logged in") {
    return res.status(401).send({ msg: "Unauthrized!" });
  }

  next();
};

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/add-event", async (req, res) => {
  const data = req.body;
  const result = await eventCollection.insertOne(data);
  console.log(result);
  res.send(result);
});

app.get("/events", async (req, res) => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
  }).format(new Date());

  const query = {
    date: { $gte: today },
  };

  if (type && type !== "ALL") {
    query.type = type;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }

  //for only type
  app.get("/event-types", async (req, res) => {
    const result = await eventCollection.distinct("type");
    res.send(result);
  });

  const result = await eventCollection.find(query).sort({ date: 1 }).toArray();
  res.send(result);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

// http://localhost:8000/event-types

export default app;
