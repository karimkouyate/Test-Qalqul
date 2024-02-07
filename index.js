const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const mysql = require('mysql2');
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const chatsRoutes = require("./routes/chats");
const app = express();
const socket = require("socket.io");
const kafka = require('kafka-node');
const redis = require('redis');
require("dotenv").config();

app.use(cors());
app.use(express.json());

// // Créer la connexion à la base de données MySQL
// const connection = mysql.createConnection({
//   host: 'localhost', // Adresse de l'hôte MySQL (généralement localhost)
//   user: 'root', // Nom d'utilisateur MySQL
//   password: '', // Mot de passe MySQL
//   database: 'qualqum' // Nom de la base de données MySQL
// });

// // Établir la connexion à la base de données MySQL
// connection.connect((err) => {
//   if (err) {
//     console.error('Erreur lors de la connexion à la base de données MySQL:', err.message);
//     return;
//   }
//   console.log('Connexion à la base de données MySQL réussie !');
// });




mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connetion Successfull");
  })
  .catch((err) => {
    console.log(err.message);
  });

const kafkaClient = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });




const consumer = new kafka.Consumer(
  kafkaClient,
  [{ topic: 'chat-messages', partition: 0 }], // Écoute du topic 'test' sur la partition 0
  { autoCommit: false } // Désactiver l'autocommit
);


// Middleware pour capturer les messages Kafka
consumer.on('message', async function (message) {
  try {
    const parsedMessage = JSON.parse(message.value);
    // Si le parsing réussit, nous continuons à utiliser les données analysées
    console.log('Contenu du message:', parsedMessage.messages.text);
    console.log('Expéditeur:', parsedMessage.messages.sender);
    console.log('ID de la salle:', parsedMessage.messages.roomId);
  } catch (error) {
    // Si le parsing échoue, nous traitons l'erreur ici
    console.error('Erreur lors de la désérialisation du message:', message.value);
    // Vous pouvez également choisir de ne pas traiter l'erreur ici et simplement ignorer le message incorrect
  }
 



// await client.disconnect();
 
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chats", chatsRoutes);

const server = app.listen(process.env.PORT, () =>
  console.log(`Server started on ${process.env.PORT}`)
);
const io = socket(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

global.onlineUsers = new Map();
global.rooms = new Map();
io.on("connection", (socket) => {
  global.chatSocket = socket;
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on("add-room", (roomId) => {
    rooms.set(roomId, socket.id);
  });

  socket.on("message", (data) => {
    const {from, roomId, msg } = data;
    const sendRoomSocket = rooms.get(roomId);
    if (sendRoomSocket) {
      socket.to(sendRoomSocket).emit('message-receive', msg);
      console.log("message sent in room " + roomId)
    }

    const producer = new kafka.Producer(kafkaClient);
    // Gérer les erreurs de production
    producer.on('error', function(err) {
      console.error('Erreur de production Kafka:', err);
    });

    // Publier un message sur le topic 'test'
    const msgObj = {
      messages: {
      text: msg,
      sender: from,
      roomId: roomId
    }, // Message à publier
    };

    const ms = JSON.stringify(msgObj)
    // Envoyer le message
    producer.send([{
      topic: 'chat-messages',
      messages: ms
    }], async function(err, data) {
      if (err) {
        console.error('Erreur lors de l\'envoi du message Kafka:', err);
      } else {
        console.log('Message envoyé avec succès à Kafka:', data);
        const client = redis.createClient();
        await client.connect();
        console.log(client.isOpen); // this is true
        await client.hSet('room:123', msgObj.messages);
      }
    });
    // Vous pouvez également stocker ce message dans Redis
   
  });
 
});
