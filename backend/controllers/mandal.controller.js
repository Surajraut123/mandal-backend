require('dotenv').config();
const bcrypt = require('bcrypt')
const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET

exports.checkHealth = async (req, res) => {
    try {
        const data = await prisma.users.findMany({select: {user_id: true}, take: 1});
        return res.json({ status: "OK", data });
    } catch (error) {
        return res.status(500).json({ status: "ERROR", message: error.message } );
    }
}

 
exports.userRegistration = async (req, res) => {
    try {
      const { firstName, lastName, profileImage, contact, email, password, role } = req.body;
      if (!firstName || !lastName || !contact || !email || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existingUser = await prisma.users.findUnique({ where : {email}})
  
      if (existingUser) {
        return res.status(409).json({ status: "WARNING", message: "Email already registered" });
      }

      const roleData = await prisma.roles.findFirst({where: {role_name: role}})
  
      if (!roleData) {
        return res.status(400).json({ status: "ERROR", message: "Invalid role" });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.users.create({
        data : {
          firstname: firstName,
          lastname: lastName,
          profile: profileImage,
          phone_no: contact,
          email: email,
          password: hashedPassword,
          status: true,
          role_id: roleData.role_id
        }
      })
  
  
      return res.json({ status: "SUCCESS", message: user });
  
    } catch (err) {
      return res.status(500).json({ status: "ERROR", message: "Message : " + err.message });
    }
};

exports.userLogin = async (req, res) => {
    const {email, password} = req.body;
    console.log(email, password);
    if(!email || !password) {
        return res.status(400).json({status: "ERROR", message: "Email and Password are required"});
    }
    try {
        
        const user = await prisma.users.findUnique({ 
          where: {email},
          select: { user_id: true, password: true, role_id: true }
        });

        if(!user) {
            return res.status(404).json({status: "ERROR", message: "Invalid credentials"});
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if(!isPasswordValid) {
            return res.status(401).json({status: "ERROR", message: "Invalid credentials"});
        }

        const userRoleName = await prisma.roles.findFirst({
          where: { role_id: user.role_id},
          select: { role_name: true }
        })
        const token = jwt.sign({ userId: user.user_id, role: userRoleName.role_name }, JWT_SECRET, { expiresIn: '2h' });

        console.log("Generated Token: ", token); 
        return res.json({status: "SUCCESS", message: "Login successful", data: { token: token, role: userRoleName.role_name, userId: user.user_id }});
    } catch (error) {
        return res.status(500).json({status: "ERROR", message: "Message: " + error.message});
    }
}

exports.contributions = async (req, res) => {
  try {
    const {userId, amount, donorName, phone_no} = req.body;
    console.log(req.body);
    if(!userId || !amount || !donorName) {
      return res.status(400).json({status: "ERROR", message: "All fields are required"});
    }

    const contribution = await prisma.contributions.create({
      data: {
        users: {
          connect: {
            user_id: userId
          }
        },
        amount: amount,
        donor_name: donorName,
        phone_no: phone_no,
        contribution_date: new Date()
      }
    });

    if(!contribution) {
      return res.status(500).json({status: "ERROR", message: "Failed to record contribution"});
    }

    return res.status(200).json({status: "SUCCESS", message: "Contribution added for new donor " + contribution});  
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: error.message});
  }
}

exports.getContributedUsers = async (req, res) => {
  try {

    const contributions = await prisma.contributions.findMany({
      select: {
        donor_name: true,
        amount: true,
        contribution_date: true,
        phone_no: true
      }
    });
    if(!contributions) {
      return res.status(404).json({status: "ERROR", message: "No contributions found"});
    }

    return res.json({status: "SUCCESS", message: contributions});
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: error.message});
  }
}

exports.getMandalMembers = async (req, res) => {
  try {
    const members = await prisma.users.findMany({
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        email: true,
        phone_no: true,
        profile: true,
        roles: {
          select: {
            role_name: true
          }
        }
      }
    });

    if(!members) {
      return res.status(404).json({status: "ERROR", message: "No members found"});
    }

    return res.json({status: "SUCCESS", message: members});
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: error.message});
  }
}

exports.requestContributionToAddInMandal = async (req, res) => {
  try {
    const {donorName, phone_no, userId, amount} = req.body;
    console.log(req.body);
    if(!donorName || !amount || !userId) {
      return res.status(400).json({status: "ERROR", message: "All fields are required"});
    }

    const request = await prisma.contribution_requests.create({
      data: {
        donor_name: donorName,
        amount: amount,
        users : {
          connect: { user_id: userId }
        },
        phone_no: phone_no,
        request_status: "OPEN"
      }
    });

    if(!request) {
      return res.status(500).json({status: "ERROR", message: "Failed to send request"});
    }

    return res.json({status: "SUCCESS", message: request});
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: error.message});
  }
}


exports.fetchContributionRequests = async (req, res) => {
  try {
    const requests = await prisma.contribution_requests.findMany({
      select: {
        request_id: true,
        donor_name: true,
        amount: true,
        phone_no: true,
        request_status: true,
        created_at: true,
        users: {
          select: {
            user_id: true,
            firstname: true,
            lastname: true,
            email: true,
            phone_no: true
          }
        }
      }
    });

    if(!requests) {
      return res.status(404).json({status: "ERROR", message: "No requests found"});
    }

    return res.json({status: "SUCCESS", data: requests});
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: error.message});
  }
}

exports.fetchMandalInvestments = async (req, res) => {
  try {
      const investments = await prisma.investments.findMany({
        select: {
          investment_id: true,
          amount: true,
          title: true,
          description: true,
          shopname: true,
          created_at: true,
          users: {
            select: {
              user_id: true,
              firstname: true,
              lastname: true,
              email: true,
              phone_no: true
            }
          }
        }
      });

      if(!investments) {
        return res.status(404).json({status: "ERROR", message: "No investments found"});
      }

      return res.json({status: "SUCCESS", data: investments});
  } catch (error) {
      return res.status(500).json({status: "ERROR", message: error.message});
  }
}

exports.updateContributionRequestStatus = async (req, res) => {
  try {
    const {contribution_id, status, userId} = req.params;

    if(!userId) {
      return res.status(400).json({status: "ERROR", message: "Access Denied"});
    }

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

    console.log("Verify User Role: ", verifyUserRole);
    if(!verifyUserRole || verifyUserRole.roles.role_name !== "treasurer") {
      return res.status(403).json({status: "ERROR", message: "You are not authorized to perform this action"});
    }

    if(!contribution_id || !status) {
      return res.status(400).json({status: "ERROR", message: "Contribution ID and Status are required"});
    }

    const validStatuses = ["OPEN", "APPROVED", "REJECTED"];
    if(!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({status: "ERROR", message: "Invalid status value"});
    }

    const updatedRequest = await prisma.contribution_requests.update({
      where: { request_id: parseInt(contribution_id) },
      data: { request_status: status.toUpperCase() }
    });

    if(!updatedRequest) {
      return res.status(500).json({status: "ERROR", message: "Failed to update request status"});
    }

    console.log("Updated Request: ", status.toUpperCase());
    if(status.toUpperCase() == "APPROVED") {
      const donorAlreadyContributed = await prisma.contributions.findFirst({
        where: {
          donor_name: updatedRequest.donor_name,
          phone_no: updatedRequest.phone_no
        }
      });
      console.log("Donor Already Contributed: ", donorAlreadyContributed);
      if(donorAlreadyContributed) {
        await prisma.contributions.update({
          where: { contribution_id: donorAlreadyContributed.contribution_id },
          data: { amount: Number(donorAlreadyContributed.amount) + Number(updatedRequest.amount) }
        });
        return res.json({status: "SUCCESS", message: "Contribution updated for existing donor"});
      } else {
        this.contributions({
          body: {
            userId: updatedRequest.user_id,
            amount: updatedRequest.amount,
            donorName: updatedRequest.donor_name,
            phone_no: updatedRequest.phone_no
          }
        });
      }
    }
    return res.json({status: "SUCCESS", message: "Request Rejected successfully"});
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: error.message});
  }
}

exports.addMandalInvestment = async (req, res) => {
  try {
    const {userId, amount, title, description, shopName} = req.body;

    if(!userId || !amount || !title) {
      return res.status(400).json({status: "ERROR", message: "All fields are required"});
    }

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        roles: {
          select: {
            role_name: true
          }
        }
      }
    });
    console.log("User Role for Investment: ", user);
    if(!user || (user.roles.role_name !== "treasurer" && user.roles.role_name !== "member" && user.roles.role_name !== "admin")) {
      return res.status(403).json({status: "ERROR", message: "You are not authorized to perform this action"});
    }

    const investment = await prisma.investments.create({
      data: {
        amount: amount,
        title: title,
        description: description,
        shopname: shopName,
        users: {
          connect: {
            user_id: userId
          }
        }
      }
    });

    if(!investment) {
      return res.status(500).json({status: "ERROR", message: "Failed to add investment"});
    }

    return res.json({status: "SUCCESS", message: investment});  
  } catch (error) {
    
  }
}

exports.updateMandalInvestment = async (req, res) => {
  try {
    const {investmentId, userId, amount, title, description, shopName} = req.body;
    
    if(!investmentId || !userId) {
      return res.status(400).json({status: "ERROR", message: "Investment ID and User ID are required"});
    }



    const investment = await prisma.investments.update({
      where: { investment_id: investmentId, user_id: userId },
      data: {
        amount: amount,
        title: title,
        description: description,
        shopname: shopName
      }
    });

    if(!investment) {
      return res.status(500).json({status: "ERROR", message: "Invalid User or Investment ID"});
    }

    return res.json({status: "SUCCESS", message: investment});  
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: error.message});
  }
}
