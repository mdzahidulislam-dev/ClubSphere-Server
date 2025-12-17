const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.port || 3000;

//middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.1yqh2qi.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const db = client.db("clubsphere");
    const usersCollection = db.collection("users");
    const clubsCollection = db.collection("clubs");

    // get all users
    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get a user by email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // update a user by id
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //post a user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //update a user by email
    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const updateFields = req.body;

      const filter = { email: email };
      const updateDoc = {
        $set: updateFields,
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get clubs by gmail
    app.get("/clubs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { managerEmail: email };
      const result = await clubsCollection.find(query).toArray();
      res.send(result);
    });

    //Approve/Reject a clubs by id
    app.patch("/clubs/:id", async (req, res) => {
      const id = req.params.id;
      const updateFields = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updateFields,
      };
      const result = await clubsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get clubs by id
    app.get("/club/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);

      const query = { _id: new ObjectId(id) };
      const result = await clubsCollection.findOne(query);
      console.log("DB result:", result);
      res.send(result);
    });

    // get clubs
    app.get("/clubs", async (req, res) => {
      const result = await clubsCollection.find().toArray();
      res.send(result);
    });

    // post a club
    app.post("/clubs", async (req, res) => {
      const club = req.body;
      const result = await clubsCollection.insertOne(club);
      res.send(result);
    });

    // Update a club
    app.patch("/clubs/:id", async (req, res) => {
      const id = req.params.id;
      const updateFields = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateClub = {
        $set: updateFields,
      };
      const result = await clubsCollection.updateOne(filter, updateClub);
      res.send(result);
    });

    // Delete a Club
    app.delete("/clubs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await clubsCollection.deleteOne(filter);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("ClubSphere server is running");
});

app.listen(port, () => {
  console.log(`ClubSphere server is running on port: ${port}`);
});
