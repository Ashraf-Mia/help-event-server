import express from "express";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
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
  const { type, search } = req.query;
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
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { location: { $regex: safeSearch, $options: "i" } },
    ];
  }
  const result = await eventCollection.find(query).sort({ date: 1 }).toArray();
  res.send(result);
});

//for only type
app.get("/event-types", async (req, res) => {
  const result = await eventCollection.distinct("type");
  res.send(result);
});

app.get("/events/:id", async (req, res) => {
  const { id } = req.params;
  const result = await eventCollection.findOne({
    _id: new ObjectId(id),
  });
  res.send(result);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

// http://localhost:8000/event-types

export default app;
