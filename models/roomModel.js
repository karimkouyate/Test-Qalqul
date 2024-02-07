const mongoose = require("mongoose");

const RoomSchema = mongoose.Schema(
  {
    name : String,
    messages: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Messages",
      required: true,
    }]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Rooms", RoomSchema);
