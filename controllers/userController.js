const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const redis = require('redis');

// Fonction pour créer un jeton JWT
const createToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1h", // Durée de validité du token
  });
};



module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.json({ msg: "Incorrect Username or Password", status: false });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.json({ msg: "Incorrect Username or Password", status: false });
    delete user.password;
    const token = createToken(user._id);
    return res.json({ status: true, user, token });
  } catch (ex) {
    next(ex);
  }
};

module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const usernameCheck = await User.findOne({ username });
    if (usernameCheck)
      return res.json({ msg: "Username already used", status: false });
    const emailCheck = await User.findOne({ email });
    if (emailCheck)
      return res.json({ msg: "Email already used", status: false });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
    });
    delete user.password;
    const token = createToken(user._id);
    return res.json({ status: true, user, token : token });
  } catch (ex) {
    next(ex);
  }
};


module.exports.getOnlineUsers = async (req, res, next) => {
  try {
    const {id} = req.params;
    const client = redis.createClient();
    await client.connect();
    console.log(id)
    const onlineUsers = await client.lRange(`connected-users${id}`, 0, 10);
    return res.status(200).json(onlineUsers);
  } catch (ex) {
    next(ex);
  }
};

