const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const stripe = require("stripe")(process.env.STRIPE_SECRET);

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
    const eventsCollection = db.collection("events");
    const membershipCollection = db.collection("membership");
    const paymentsCollection = db.collection("payments");
    const eventRegistrationCollection = db.collection("eventRegistration");

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
      const query = { _id: new ObjectId(id) };
      const result = await clubsCollection.findOne(query);
      res.send(result);
    });

    // get clubs
    app.get("/clubs", async (req, res) => {
      const result = await clubsCollection.find().toArray();
      res.send(result);
    });

    // get clubs with status
    app.get("/all-clubs/status", async (req, res) => {
      const { status } = req.query;
      const query = status ? { status } : {};
      const result = await clubsCollection.find(query).toArray();
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

    // events releted apis -------------------------------

    // POST - Create a new event
    app.post("/events", async (req, res) => {
      try {
        const event = req.body;
        if (event.eventDate && event.eventTime) {
          event.eventDateTime = `${event.eventDate}T${event.eventTime}`;
        }

        const result = await eventsCollection.insertOne(event);
        res.send(result);
      } catch (error) {
        console.error("Create Event Error:", error);
        res.status(500).send({ message: "Failed to create event" });
      }
    });

    // Function to determine event status based on date and time
    function getEventStatus(eventDateTime) {
      const now = new Date();
      const eventDate = new Date(eventDateTime);

      if (eventDate < now) return "past";
      const diffDays = (eventDate - now) / (1000 * 60 * 60 * 24);
      if (diffDays <= 5) return "ongoing";
      return "upcoming";
    }

    // GET - Get events by email with status
    app.get("/events/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const events = await eventsCollection
          .find({ managerEmail: email })
          .toArray();

        const updatedEvents = events.map((event) => ({
          ...event,
          status: getEventStatus(event.eventDateTime),
        }));

        res.send(updatedEvents);
      } catch (error) {
        console.error("Get Events Error:", error);
        res.status(500).send({ message: "Failed to get events" });
      }
    });

    // GET - Get all events with status "ongoing" or "upcoming"
    app.get("/all-events", async (req, res) => {
      try {
        // Fetch all events from database
        const events = await eventsCollection.find({}).toArray();

        // Add status to each event and filter for ongoing/upcoming only
        const filteredEvents = events
          .map((event) => ({
            ...event,
            status: getEventStatus(event.eventDateTime),
          }))
          .filter(
            (event) => event.status === "ongoing" || event.status === "upcoming"
          );

        res.send(filteredEvents);
      } catch (error) {
        console.error("Get All Events Error:", error);
        res.status(500).send({ message: "Failed to get events" });
      }
    });

    // get events-details by id
    app.get("/event-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await eventsCollection.findOne(query);
      res.send(result);
    });

    // PATCH - Update an event
    app.patch("/events/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const {
          eventName,
          description,
          location,
          eventDate,
          eventTime,
          eventFee,
          bannerImage,
          clubId,
        } = req.body;

        const eventDateTime = `${eventDate}T${eventTime}`;

        const updateEvent = {
          $set: {
            eventName,
            description,
            location,
            eventDate,
            eventTime,
            eventDateTime,
            eventFee,
            bannerImage,
            clubId,
          },
        };

        const result = await eventsCollection.updateOne(
          { _id: new ObjectId(id) },
          updateEvent
        );

        res.send(result);
      } catch (error) {
        console.error("Update Event Error:", error);
        res.status(500).send({ message: "Failed to update event" });
      }
    });

    // Delete a events
    app.delete("/events/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await eventsCollection.deleteOne(filter);
      res.send(result);
    });

    // POST - Register for an event
    app.post("/event-registrations", async (req, res) => {
      try {
        const registration = req.body;

        const existingRegistration = await eventRegistrationCollection.findOne({
          eventId: registration.eventId,
          userEmail: registration.userEmail,
          status: "registered",
        });

        if (existingRegistration) {
          return res.status(400).send({
            message: "You are already registered for this event",
            alreadyRegistered: true,
          });
        }

        // Insert the registration
        const result = await eventRegistrationCollection.insertOne(
          registration
        );

        res.send({
          success: true,
          message: "Registration successful",
          result,
        });
      } catch (error) {
        console.error("Event Registration Error:", error);
        res.status(500).send({ message: "Failed to register for event" });
      }
    });


    //get register user by id for events details
    app.get("/event-registration/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const eventId = req.query.eventId;

        if (!email || !eventId) {
          return res.status(400).send({ message: "Email and eventId required" });
        }

        const query = {
           userEmail: email,
           eventId: eventId,
        };

        const result = await eventRegistrationCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.error("Get Membership Error:", error);
        res.status(500).send({ message: "Failed to get membership" });
      }
    });

    //add new member
    app.post("/addMembership", async (req, res) => {
      try {
        const membershipInfo = req.body;

        const query = {
          clubId: membershipInfo.clubId,
          memberEmail: membershipInfo.memberEmail,
        };

        const existingMember = await membershipCollection.findOne(query);

        if (existingMember) {
          return res.status(409).send({
            message: "Member already exists in this club",
            membershipId: existingMember._id,
          });
        }

        membershipInfo.joinAt = new Date();

        const result = await membershipCollection.insertOne(membershipInfo);

        // Update club member count AFTER successful insert
        await clubsCollection.updateOne(
          { _id: new ObjectId(membershipInfo.clubId) },
          { $inc: { membersCount: 1 } }
        );

        return res.send({
          message: "Membership added successfully",
          membershipId: result.insertedId,
        });
      } catch (error) {
        console.error("Add Membership Error:", error);
        return res.status(500).send({ message: "Failed to add membership" });
      }
    });

    // get membership id by email
    app.get("/membership/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const clubId = req.query.clubId;

        if (!email || !clubId) {
          return res.status(400).send({ message: "Email and clubId required" });
        }

        const query = {
          memberEmail: email,
          clubId: clubId,
        };

        const result = await membershipCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.error("Get Membership Error:", error);
        res.status(500).send({ message: "Failed to get membership" });
      }
    });

    app.get("/my-memberships/:email", async (req, res) => {
      const email = req.params.email;
      const result = await membershipCollection
        .find({ memberEmail: email })
        .toArray();
      res.send(result);
    });

    app.patch("/updateMembershipStatus/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const status = req.body.status;
      const updateStatus = {
        $set: {
          status: status,
        },
      };
      const result = await membershipCollection.updateOne(query, updateStatus);
      res.send(result);
    });

    // payment related apis
    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      const amount = parseInt(paymentInfo.clubFee) * 100;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amount,
              product_data: {
                name: `Please pay to join: ${paymentInfo.clubName}`,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        metadata: {
          clubId: paymentInfo.clubId,
          clubName: paymentInfo.clubName,
          clubManagerEmail: paymentInfo.clubManagerEmail,
          customer_name: paymentInfo.memberName,
          customer_photo: paymentInfo.memberPhoto,
          type: "membership",
        },
        customer_email: paymentInfo.memberEmail,
        success_url: `${process.env.SITE_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/payment-canceled`,
      });

      res.send({ url: session.url });
    });

    // payment success and add to membership db or payments db
    app.patch("/payment-success", async (req, res) => {
      try {
        const sessionId = req.query.session_id;
        if (!sessionId)
          return res.status(400).send({ message: "No session ID" });

        // Stripe session retrieve
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
          return res.status(400).send({ message: "Payment not completed" });
        }

        // Check if payment already exists
        const existingPayment = await paymentsCollection.findOne({
          transactionId: session.payment_intent,
        });

        if (existingPayment) {
          return res.status(409).send({
            message: "Payment already processed",
            transactionId: session.payment_intent,
          });
        }

        // Save payment db
        const payment = {
          amount: session.amount_total / 100,
          currency: session.currency,
          memberEmail: session.customer_email,
          memberName: session.metadata.customer_name,
          memberPhoto: session.metadata.customer_photo,
          type: session.metadata.type,
          clubId: session.metadata.clubId,
          clubName: session.metadata.clubName,
          clubManagerEmail: session.metadata.clubManagerEmail,
          transactionId: session.payment_intent,
          paymentStatus: session.payment_status,
          paidAt: new Date(),
        };

        await paymentsCollection.insertOne(payment);

        // Add member to membership collection
        const membershipQuery = {
          amount: session.amount_total / 100,
          clubId: session.metadata.clubId,

          transactionId: session.payment_intent,
          paymentStatus: session.payment_status,
        };
        console.log(session);

        const existingMember = await membershipCollection.findOne(
          membershipQuery
        );

        if (!existingMember) {
          await membershipCollection.insertOne({
            clubId: session.metadata.clubId,
            clubName: session.metadata.clubName,
            clubManagerEmail: session.metadata.clubManagerEmail,
            amount: session.amount_total / 100,
            memberEmail: session.customer_email,
            memberName: session.metadata.customer_name,
            memberPhoto: session.metadata.customer_photo,
            status: "paid",
            joinAt: new Date(),
          });
        } else {
          // Update status if already exists
          await membershipCollection.updateOne(membershipQuery, {
            $set: { status: "paid" },
          });
        }

        // Update club member count
        await clubsCollection.updateOne(
          { _id: new ObjectId(session.metadata.clubId) },
          { $inc: { membersCount: 1 } }
        );

        return res.send({
          success: true,
          clubId: session.metadata.clubId,
          clubName: session.metadata.clubName,
          transactionId: session.payment_intent,
          amount: session.amount_total / 100,
        });
      } catch (error) {
        console.error("Payment Success Error:", error);
        return res.status(500).send({ message: "Payment processing failed" });
      }
    });

    // get all payments
    app.get("/payments", async (req, res) => {
      const role = req.query.role;
      const query = {};
      if (role) {
        query.role = role;
      }

      const result = await paymentsCollection.find(query).toArray();
      res.send(result);
    });

    // get all payments
    app.get("/payments/:email", async (req, res) => {
      const email = req.params.email;
      const query = {};
      if (email) {
        query.memberEmail = email;
      }

      const result = await paymentsCollection.find(query).toArray();
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
