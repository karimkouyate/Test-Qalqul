const { getOnlineUsers } = require("../controllers/userController");

const router = require("express").Router();

router.get("/:id/online", getOnlineUsers);

module.exports = router;
