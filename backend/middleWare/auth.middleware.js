const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET


exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if(!authHeader) {
      return res.status(401).json({status: "ERROR", message: "Access Denied"})
    }
    const token = authHeader.split(' ')[1];
    console.log("Token verify : ", token)
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: "Invalid token" });
      req.user = user;
      next();
    })
}

exports.authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.body.role;
        console.log("User Role: ", userRole);
        console.log("allowedRoles Role: ", allowedRoles);
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ status: "ERROR", message: "Forbidden: You don't have enough privileges to access this resource." });
        }
        next();
    }
}