const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const kafka = require("kafka-node");
const redis = require("redis");
const socket = require("socket.io");
const authRoutes = require("./routes/auth");
const chatsRoutes = require("./routes/chats");
const usersRoutes = require("./routes/users");
const { authMiddleware } = require("./controllers/middleware/authMiddleware");
require("dotenv").config();

const app = express();
const server = app.listen(process.env.PORT, () =>
  console.log(`Server started on ${process.env.PORT}`)
);
const io = socket(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB Connection Successful"))
  .catch((err) => console.error("DB Connection Error:", err.message));

const kafkaClient = new kafka.KafkaClient({ kafkaHost: "localhost:9092" });

const setupKafkaConsumer = (topic, callback) => {
  const consumer = new kafka.Consumer(kafkaClient, [{ topic, partition: 0 }], {
    autoCommit: false,
  });

  consumer.on("error", function (error) {
    console.error(`Error from ${topic} consumer:`, error);
  });

  consumer.on("message", callback);
};

const setupKafkaProducer = () => {
  const producer = new kafka.Producer(kafkaClient);

  // producer.on('ready', () => {
  //   producer.createTopics(['chat-messages', 'chat-events'], (err, data) => {
  //     if (err) console.error('Error creating Kafka topics:', err);
  //     else console.log('Kafka topics created:', data);
  //   });
  // });

  producer.on("error", function (err) {
    console.error("Kafka Production Error:", err);
  });

  return producer;
};

const producer = setupKafkaProducer();

setupKafkaConsumer("chat-messages", async function (message) {
  try {
    const parsedMessage = JSON.parse(message.value);
    console.log("Message Content:", parsedMessage.messages.text);
    console.log("Sender:", parsedMessage.messages.sender);
    console.log("Room ID:", parsedMessage.messages.roomId);
  } catch (error) {
    console.error("Error parsing message:", message.value);
  }
});

setupKafkaConsumer("chat-events", async function (message) {
  try {
    const parsedMessage = JSON.parse(message.value);
    console.log("Message Content Event:", parsedMessage.messages.message);
    console.log("Sender Event:", parsedMessage.messages.userId);
    console.log("Room ID Event:", parsedMessage.messages.roomId);
  } catch (error) {
    console.error("Error parsing message:", message.value);
  }
});

async function publishOnlineUsers(roomId) {
  try {
    const client = redis.createClient();
    await client.connect();
    const users = await client.lRange(`connected-users${roomId}`, 0, -1);
    const uniqueUsers = [...new Set(users)];
    await client.publish("online-users", JSON.stringify(uniqueUsers));
    console.log("Online users published:", uniqueUsers);
  } catch (err) {
    console.error("Redis Error:", err);
  }
}

global.rooms = new Map();
global.onlineUsers = new Map();
io.on("connection", (socket) => {
  global.chatSocket = socket;

  socket.on("add-room", (roomId) => {
    rooms.set(roomId, socket.id);
  });

  socket.on("join-room", async (userId, roomId) => {
    console.log(userId, roomId);
    onlineUsers.set(socket.id, userId);
    socket.join(roomId);
    console.log(`Client joined room ${roomId}`);
    io.to(roomId).emit("user-joined", { roomId });

    const msgObj = {
      messages: {
        message: "User join room",
        userId: socket.id,
        roomId: roomId,
      },
    };

    const ms = JSON.stringify(msgObj);
    producer.send(
      [{ topic: "chat-events", messages: ms }],
      async function (err, data) {
        if (err) {
          console.error("Kafka Message Sending Error:", err);
        } else {
          console.log(
            "User join room sent to Kafka on chat-events topics :",
            data
          );
        }
      }
    );

    const client = redis.createClient();
    await client.connect();
    if (client.isOpen) {
      if (onlineUsers.get(socket.id)) {
        client.rPush(`connected-users${roomId}`, onlineUsers.get(socket.id));
      }
      publishOnlineUsers(roomId);
    }
  });

  socket.on("leave-room", async (roomId) => {
    socket.leave(roomId);
    onlineUsers.delete(socket.id);
    console.log(`Client left room ${roomId}`);
    io.to(roomId).emit("user-left", { roomId });

    const msgObj = {
      messages: {
        message: "User left room",
        userId: socket.id,
        roomId: roomId,
      },
    };

    const ms = JSON.stringify(msgObj);
    producer.send(
      [{ topic: "chat-events", messages: ms }],
      async function (err, data) {
        if (err) {
          console.error("Kafka Message Sending Error:", err);
        } else {
          console.log("Message sent to Kafka:", data);
        }
      }
    );

    const client = redis.createClient();
    await client.connect();
    if (client.isOpen) {
      if (onlineUsers.get(socket.id)) {
        client.lRem(`connected-users${roomId}`, 0, onlineUsers.get(socket.id));
      }
      publishOnlineUsers(roomId);
    }
  });

  socket.on("message", (data) => {
    const { from, roomId, msg } = data;
    io.to(roomId).emit("message-receive", { msg, roomId });
    console.log("Message sent in room " + roomId);

    const msgObj = {
      messages: {
        text: msg,
        sender: from,
        roomId: roomId,
      },
    };

    const ms = JSON.stringify(msgObj);

    producer.send(
      [{ topic: "chat-messages", messages: ms }],
      async function (err, data) {
        if (err) {
          console.error("Kafka Message Sending Error:", err);
        } else {
          console.log("Message sent to Kafka:", data);

          const client = redis.createClient();
          await client.connect();

          if (client.isOpen) {
            client.rPush(`room-${roomId}`, JSON.stringify(msgObj.messages));
          }
        }
      }
    );
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/chats", authMiddleware, chatsRoutes);
app.use("/api/users", authMiddleware, usersRoutes);
