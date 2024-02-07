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
   
    const { id } = req.params;
    const client = redis.createClient();
    await client.connect();
    const roomRecentMessages =  await client.lRange(`room-${id}`, 0, 5);
    const parsedData = roomRecentMessages.map(item => JSON.parse(item));
    return res.status(200).json(parsedData);
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
