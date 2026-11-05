import express from "express";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import { createRemoteJWKSet, jwtVerify } from "jose";

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
const joinEventCollection = db.collection("joinEvent");

const getToday = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
  }).format(new Date());
};

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log(authHeader);
  if (!authHeader) {
    return res.status(401).send({ mas: "unAuthorized!" });
  }

  const token = authHeader.split(" ")[1];
  console.log(token);

  if (!token) {
    return res.status(401).send({ msg: "unAuthorized!" });
  }

  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URI}/api/auth/jwks`),
  );

  console.log(JWKS, "jwks");

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log("success");

    next();
  } catch (error) {
    return res.status(500).send({ msg: "Server Error!" });
  }
};

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// for create event
app.post("/add-event", verifyToken, async (req, res) => {
  const data = req.body;
  const result = await eventCollection.insertOne(data);
  console.log(result);
  res.send(result);
});

// for home page
app.get("/sixEvents", async (req, res) => {
  const today = getToday();

  const query = {
    date: { $gte: today },
  };

  const result = await eventCollection
    .find(query)
    .sort({ date: 1 })
    .limit(6)
    .toArray();
  res.send(result);
});

// for upcoming page
app.get("/events", async (req, res) => {
  const { type, search } = req.query;
  const today = getToday();

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

//for details event
app.get("/events/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ message: "Event not found" });
  }
  const result = await eventCollection.findOne({
    _id: new ObjectId(id),
  });

  if (!result) {
    return res.status(404).send({ message: "Event not found" });
  }

  res.send(result);
});

// for manage my event
app.get("/my-events/:email", verifyToken, async (req, res) => {
  const { email } = req.params;
  const today = getToday();

  const query = {
    email: email,
    date: { $gte: today },
  };

  const result = await eventCollection.find(query).sort({ date: 1 }).toArray();
  res.send(result);
});

app.patch("/my-events/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const result = await eventCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData },
  );
  res.json(result);
});

app.delete("/my-events/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const result = await eventCollection.deleteOne({
    _id: new ObjectId(id),
  });
  res.send(result);
});

// for join event
app.post("/join-event", async (req, res) => {
  const data = req.body;

  const eventId = data._id;
  const creatorEmail = data.email;
  const userEmail = data.userEmail;

  if (userEmail === creatorEmail) {
    {
      return res
        .status(400)
        .send({ msg: "You cannot join own created event!" });
    }
  }

  const today = getToday();

  if (data.date < today) {
    return res.status(400).send({ msg: "You cannot join past events!" });
  }

  const allReadyJoined = await joinEventCollection.findOne({
    eventId: eventId,
    userEmail: userEmail,
  });

  if (allReadyJoined) {
    const result = await joinEventCollection.deleteOne({
      _id: allReadyJoined._id,
    });
    return res.json(result);
  }

  const { _id, ...rest } = data;
  const joinData = { ...rest, eventId: _id };

  const result = await joinEventCollection.insertOne(joinData);
  return res.json(result);
});

app.get("/is-joined", async (req, res) => {
  const { eventId, userEmail } = req.query;

  const existingJoin = await joinEventCollection.findOne({
    eventId: eventId,
    userEmail: userEmail,
  });

  res.send({ isJoined: !!existingJoin });
});

// for manage my join
app.get("/my-joined/:email", verifyToken, async (req, res) => {
  const { email } = req.params;
  const today = getToday();

  const query = {
    userEmail: email,
    date: { $gte: today },
  };

  const result = await joinEventCollection
    .find(query)
    .sort({ date: 1 })
    .toArray();
  res.send(result);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

// http://localhost:8000/sixEvents

export default app;
