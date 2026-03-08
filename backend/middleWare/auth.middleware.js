require('dotenv').config();
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');


exports.verifyToken = (req, res, next) => {
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
      return res.status(401).json({
        status: "ERROR",
        message: "Access Denied"
      });
    }
    const JWT_SECRET = process.env.JWT_SECRET;

    jwt.verify(accessToken, JWT_SECRET, (err, user) => {
      if (err) {
    
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({
            message: "Your session is expired, please login again"
          });
        }
    
        return res.status(403).json({
          message: "Invalid token"
        });
      }
    
      req.user = user;
      next();
    });
}

exports.authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        const userId = req.user.userId;
        // console.log("User Role: ", userRole);
        // console.log("allowedRoles Role: ", allowedRoles);
        // if (!allowedRoles.includes(userRole)) {
        //     return res.status(403).json({ status: "ERROR", message: "Forbidden: You don't have enough privileges to access this resource." });
        // }
        console.log("Inside authorizeRoles middleware, UserId: ", userId);
        const verifyUserRole = await prisma.users.findUnique({
          where: { user_id: parseInt(userId) },
          select: {
            roles: {
              select: {
                role_name: true
              }
            }
          }
        });

        if(!verifyUserRole) {
          return res.status(404).json({status: "ERROR", message: "User not found"});
        }

        const userRole = verifyUserRole.roles.role_name;
    
        console.log("Verify User Role: ", verifyUserRole);
        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({status: "ERROR", message: "You are not authorized to perform this action"});
        }
        next();
    }
}