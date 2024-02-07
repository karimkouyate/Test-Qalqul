const Room = require("../models/roomModel");
const Messages = require("../models/messageModel");
const redis = require('redis');

module.exports.getAvailableChatRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find();
    return res.json(rooms);
  } catch (ex) {
    next(ex);
  }
};

module.exports.addChatRoom = async (req, res, next) => {
  try {
    const { name } = req.body;
    const chatRoom = new Room({ name });
    await chatRoom.save();
    return res.json(chatRoom);
  } catch (ex) {
    next(ex);
  }
};

module.exports.getSpecificRoomRecentMessages = async (req, res, next) => {
  try {
    const { name } = req.body;
    const chatRoom = new Room({ name });
    await chatRoom.save();
    const { id } = req.params;

    const room = await Room.findById(id).populate({
      path: "messages",
      options: {
        sort: { createdAt: -1 }, // Trie par ordre décroissant de l'horodatage
        limit: 10, // Limite le nombre de messages à 10
      },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const client = redis.createClient();
    await client.connect();
    const roomRecentMessages = await client.hGetAll('room:123');
    console.log(JSON.stringify(roomRecentMessages, null, 2));

    return res.status(200).json(room.messages);

    // const client = redis.createClient();
    // await client.connect();
    // console.log(client.isOpen); // this is true
    // client.lrange(`chat:${id}`, 0, -1, (err, messages) => {
    //     if (err) throw err;
    //     return res.json(messages);
    // })





  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports.addMessageToRoom = async (req, res, next) => {
    try {
      const { from, message } = req.body;
      const {id} = req.params
  
      // Créez le message
      const newMessage = await Messages.create({
        message: { text: message },
        sender: from,
        room : id
      });
  
      // Ajoutez le message à la salle spécifiée
      const room = await Room.findByIdAndUpdate(id, {
        $push: { messages: newMessage._id }
      });
  
      if (!room) {
        return res.status(404).json({ msg: "Room not found." });
      }
  
      return res.json(room);
    } catch (error) {
      next(error);
    }
  };
