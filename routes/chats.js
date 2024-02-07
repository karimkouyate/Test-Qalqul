
const { getAvailableChatRooms, addChatRoom, getSpecificRoomRecentMessages, addMessageToRoom } = require("../controllers/roomController");

const router = require("express").Router();

router.post("/", addChatRoom);
router.get("/", getAvailableChatRooms);
router.get("/:id/messages", getSpecificRoomRecentMessages)
router.post("/:id/messages", addMessageToRoom);

module.exports = router;
