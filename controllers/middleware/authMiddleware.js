const jwt = require("jsonwebtoken");

const verifyToken = (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.userId;
    } catch (error) {
      return null; // Le token est invalide ou a expiré
    }
  };


module.exports.authMiddleware = async(req, res, next) => {
    const token = req.headers.authorization;
    console.log(token);
    if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = verifyToken(token);
    if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
    }
    req.userId = userId;
    next();
};