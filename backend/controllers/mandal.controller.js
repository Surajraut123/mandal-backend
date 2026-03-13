require('dotenv').config();
const bcrypt = require('bcrypt')
const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');
const { createContribution } = require('../services/contribution.service');
const { getContributionRequests } = require('../services/contributionRequest.service');
const { getInvestmentRequests } = require('../services/investmentRequest.service');
const { requestContributionToAdd } = require('../services/requestContributionToAdd.service');
const { requestInvestmentToAdd } = require('../services/requestInvestmentToAdd.service');
const { getMandalMembers } = require('../services/getMandalMemebers.service');
const { checkUserRole } = require('../services/checkUserRole');
const { supabase } = require('../supabase-connection/supabase.config');
const JWT_SECRET = process.env.JWT_SECRET


const sendEmailOTP = async (email) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      shouldCreateUser: false,
    }
  });

  if (error) {
    console.error('Error sending OTP:', error.message);
    return { success: false, error: error.message };
  }
  
  return { success: true, message: 'OTP sent to email' };
};

const verifyEmailOTP = async (email, otp) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email,
    token: otp,
    type: 'email'
  });

  if (error) {
    console.error('Error verifying OTP:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user };
};

exports.verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ status: "ERROR", message: "Email and OTP are required" });
    }

    const result = await verifyEmailOTP(email, otp);
    if (result.success) {
      return res.status(200).json({ status: "SUCCESS", message: "OTP verified successfully" });
    } else {
      return res.status(400).json({ status: "ERROR", message: result.error });
    }
  } catch (error) {
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
}

exports.sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: "ERROR", message: "Email is required" });
    }

    const user = await prisma.users.findUnique({ 
      where: {email},
      select: { user_id: true, password: true, role_id: true }
    });

    if(!user) {
      return res.status(404).json({status: "ERROR", message: "Email not registered"});
    }

    const result = await sendEmailOTP(email);
    if (result.success) {
      return res.status(200).json({ status: "SUCCESS", message: result.message });
    } else {
      return res.status(500).json({ status: "ERROR", message: result.error });
    }
  } catch (error) {
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ status: "ERROR", message: "Email and new password are required" });
    }

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ status: "ERROR", message: "Email not registered" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { email },
      data: { password: hashedPassword }
    });

    return res.status(200).json({ status: "SUCCESS", message: "Password reset successfully" });
  } catch (error) {
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
}

exports.checkHealth = async (req, res) => {
    try {
        const data = await prisma.users.findMany({select: {user_id: true}, take: 1});
        return res.json({ status: "OK", data });
    } catch (error) {
        return res.status(500).json({ status: "ERROR", message: error.message } );
    }
}

exports.fetchProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userProfile = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        firstname: true,
        lastname: true,
        email: true,
        phone_no: true,
        profile: true,
        status: true,
        roles: {
          select: {
            role_name: true
          }
        }
      }
    });

    if (!userProfile) {
      return res.status(404).json({ status: "ERROR", message: "User not found" });
    }

    return res.status(200).json({ status: "SUCCESS", data: userProfile });
  } catch (error) {
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
}

exports.updateProfile = async (req, res) => {
  try {
    console.log("Update Profile Request Body: ", req.body);
    const userId = req.user.userId;
    const { firstName, lastName, email, phone } = req.body;
    console.log("req.file:", req.file);
    const existingUser = await prisma.users.findUnique({
      where: { user_id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ status: "ERROR", message: "User not found" });
    }

    if (email && email !== existingUser.email) {
      const emailExists = await prisma.users.findUnique({
        where: { email }
      });
      
      if (emailExists) {
        return res.status(400).json({ status: "ERROR", message: "Email already in use" });
      }
    }

    const updateData = {};
    if (firstName) updateData.firstname = firstName;
    if (lastName) updateData.lastname = lastName;
    if (email) updateData.email = email;
    if (phone) updateData.phone_no = phone;

    if (req.file) {
      updateData.profile = req.file.path; 
    }

    const updatedUser = await prisma.users.update({
      where: { user_id: userId },
      data: updateData,
      select: {
        firstname: true,
        lastname: true,
        email: true,
        phone_no: true,
        profile: true,
        status: true,
        roles: {
          select: {
            role_name: true
          }
        }
      }
    });

    return res.status(200).json({ 
      status: "SUCCESS", 
      message: "Profile updated successfully",
      data: updatedUser 
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
};

exports.authCheck = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {roleName, fullName, profile} = await checkUserRole(userId)
    return res.json({ status: "SUCCESS", "isAuthenticated": true, role: roleName, userId: userId, fullName: fullName, profile: profile });
  } catch (error) {
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
}

exports.logout = async (req, res) => {
  try {
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
      
    return res.status(200).json({ status: "SUCCESS", message: "Logged out successfully" });
    
  } catch (error) {
    return res.status(403).json({ status: "ERROR", message : error.message})
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

      const isAdminAlreadyExists = await prisma.users.findFirst({
        where: {
          role_id: roleData.role_id
        }
      });

      if(role.toLowerCase() === "admin" && isAdminAlreadyExists) {
        return res.status(409).json({ status: "WARNING", message: "Admin already exists!" });
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
        console.log("Password Valid: ", isPasswordValid);
        if(!isPasswordValid) {
          console.log("User found: ", user);
            return res.status(401).json({status: "ERROR", message: "Invalid credentials"});
        }

        const userRoleName = await prisma.roles.findFirst({
          where: { role_id: user.role_id},
          select: { role_name: true }
        })
        const token = jwt.sign({ userId: user.user_id, role: userRoleName.role_name }, JWT_SECRET, { expiresIn: '2h' });

        res.cookie("access_token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none"
        });

        console.log("Generated Token: ", token); 
        return res.json({status: "SUCCESS", message: "Login successful", data: { role: userRoleName.role_name, userId: user.user_id }});
    } catch (error) {
        return res.status(500).json({status: "ERROR", message: "Message: " + error.message});
    }
}

exports.contributions = async (req, res) => {
  try {
    const {userId, amount, donorName, phone_no} = req.body;
    console.log("Contributions body : ", req.body);
    if(!userId || !amount || !donorName) {
      return res.status(400).json({status: "ERROR", message: "All fields are required"});
    }

    const contribution = await createContribution({
      userId,
      amount,
      donorName,
      phone_no
    });

    if(!contribution) {
      return res.status(500).json({status: "ERROR", message: "Failed to record contribution"});
    }

    return res.status(201).json({status: "SUCCESS", message: "Contribution added for new donor " + contribution});  
  } catch (error) {
    console.error("Contribution error:", error);
    if (error.code === "P2002") {
      return res.status(409).json({
        status: "ERROR",
        message: "Phone number already exists"
      });
    }

    return res.status(500).json({
      status: "ERROR",
      message: error.message
    });
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

    return res.json({status: "SUCCESS", data: contributions});
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: error.message});
  }
}

exports.getMandalMembers = async (req, res) => {
  try {
    const members = await getMandalMembers()

    if(!members) {
      return res.status(404).json({status: "ERROR", message: "No members found"});
    }

    return res.json({status: "SUCCESS", userList: members});
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

    const user = await prisma.users.findUnique({
      where: { user_id: Number(userId) }
    });

    if(!user) {
      return res.status(404).json({status: "ERROR", message: "User not found"});
    }

    const request = await requestContributionToAdd(
      donorName,
      amount,
      phone_no,
      userId
    );

    if(!request) {
      return res.status(500).json({status: "ERROR", message: "Failed to send request"});
    }

    return res.json({status: "SUCCESS", data: request, message: "Contribution request sent successfully"});
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: error.message});
  }
}

exports.requestInvestmentToAddInMandal = async (req, res) => {
  try {
    const {shopName, userId, amount, title, description} = req.body;
    console.log(req.body);
    if(!amount || !userId || !title) {
      return res.status(400).json({status: "ERROR", message: "All fields are required"});
    }

    const request = await requestInvestmentToAdd(
      shopName,
      userId,
      amount,
      title,
      description
    );

    if(!request) {
      return res.status(500).json({status: "ERROR", message: "Failed to send investment request"});
    }

    return res.json({status: "SUCCESS", message: "Investment request sent successfully", data: request});
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: error.message});
  }
}

exports.fetchInvestmentRequests = async (req, res) => {
  try {
    const userId = req.user.userId
    const requests = await getInvestmentRequests(userId)

    if(!requests) {
      return res.status(404).json({status: "ERROR", message: "No investment requests found"});
    }

    return res.json({status: "SUCCESS", data: requests});
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: error.message});
  }
}

exports.fetchContributionRequests = async (req, res) => {
  try {
    const userId = req.user.userId
    console.log("userid : ", userId)
    const requests = await getContributionRequests(userId)

    if(!requests) {
      return res.status(404).json({status: "ERROR", message: "No requests found"});
    }

    return res.json({status: "SUCCESS", data: requests});
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: "CHECK : " + error.message});
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
    const {contribution_id, status} = req.params;
    const userId = Number(req.user.userId);
    console.log("UserId from token: ", userId);

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
    const allowedRoles = ["treasurer", "admin"];
    const userRole = verifyUserRole.roles.role_name.toLowerCase();
    
    if(!verifyUserRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({status: "ERROR", message: "You are not authorized to perform this action"});
    }

    if(!contribution_id || !status) {
      return res.status(400).json({status: "ERROR", message: "Contribution ID and Status are required"});
    }

    const validStatuses = ["OPEN", "APPROVED", "REJECTED"];
    if(!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({status: "ERROR", message: "Invalid status value"});
    }

    const currentRequest = await prisma.contribution_requests.findUnique({
      where: { request_id: parseInt(contribution_id) }
    });
    
    const previousStatus = currentRequest.request_status.toUpperCase();
    const newStatus = status.toUpperCase();

    const updatedRequest = await prisma.contribution_requests.update({
      where: { request_id: parseInt(contribution_id) },
      data: { request_status: status.toUpperCase() }
    });

    if(!updatedRequest) {
      return res.status(500).json({status: "ERROR", message: "Failed to update request status"});
    }

    console.log("Updated Request: ", status.toUpperCase());
    console.log("updatedRequest: ", updatedRequest);
    const donorAlreadyContributed = await prisma.contributions.findFirst({
      where: {
        donor_name: updatedRequest.donor_name,
        phone_no: updatedRequest.phone_no
      }
    });
    
    console.log("Donor Already Contributed: ", donorAlreadyContributed);
    if(status.toUpperCase() == "APPROVED") {
      if(donorAlreadyContributed) {
        await prisma.contributions.update({
          where: { contribution_id: donorAlreadyContributed.contribution_id },
          data: { amount: Number(donorAlreadyContributed.amount) + Number(updatedRequest.amount) }
        });
        return res.json({status: "SUCCESS", message: "Request Approved successfully for existing donor"});
      } else {
        await createContribution({
          userId: updatedRequest.user_id,
          amount: updatedRequest.amount,
          donorName: updatedRequest.donor_name,
          phone_no: updatedRequest.phone_no
        });
      }
      return res.status(200).json({status: "SUCCESS", message: "Request Approved successfully for new user"});
    } else if (status.toUpperCase() === "REJECTED") {
      if (previousStatus === 'APPROVED' && newStatus === 'REJECTED') {
        if(donorAlreadyContributed) {
          const finalDonationAmount = donorAlreadyContributed.amount - updatedRequest.amount;
          if(finalDonationAmount == 0) {
            await prisma.contributions.delete({
              where: { contribution_id: donorAlreadyContributed.contribution_id}
            })
          } else if(finalDonationAmount > 0){
            await prisma.contributions.update({
              where: {
                contribution_id: donorAlreadyContributed.contribution_id
              },
              data: {
                amount: finalDonationAmount
              }
            })
          } else{
            return res.status(400).json({
              status: "ERROR", 
              message: `Cannot reject. Donor contributed ₹${donorAlreadyContributed.amount}, but request is ₹${updatedRequest.amount}`
            });
          }
          return res.status(200).json({status: "SUCCESS", message: "Request Rejected successfully for existing donor"});
        }
        return res.status(403).json({status: "SUCCESS", message: "Something went wrong"});
      } else{
        return res.status(200).json({status: "SUCCESS", message: "Request Rejected successfully"});
      }
    } else{
      return res.status(200).json({status: "SUCCESS", message: "Not allowed to OPEN the status"});
    }
  } catch (error) {
    return res.status(500).json({status: "ERROR", message: error.message});
  }
}

exports.updateInvestmentRequestStatus = async (req, res) => {
  try {
    const { investment_id, status } = req.params;
    const userId = req.user.userId;

    if (!userId) {
      return res.status(400).json({ status: "ERROR", message: "Access Denied" });
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

    if (!verifyUserRole || verifyUserRole.roles.role_name !== "treasurer") {
      return res.status(403).json({ status: "ERROR", message: "You are not authorized to perform this action" });
    }

    if (!investment_id || !status) {
      return res.status(400).json({ status: "ERROR", message: "Investment ID and Status are required" });
    }

    const validStatuses = ["OPEN", "APPROVED", "REJECTED"];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({ status: "ERROR", message: "Invalid status value" });
    }

    const currentRequest = await prisma.investment_requests.findUnique({
      where: { request_id: parseInt(investment_id) }
    });

    if (!currentRequest) {
      return res.status(404).json({ status: "ERROR", message: "Investment request not found" });
    }

    const previousStatus = currentRequest.request_status.toUpperCase();
    const newStatus = status.toUpperCase();

    const validTransitions = {
      'OPEN': ['APPROVED', 'REJECTED'],
      'APPROVED': ['REJECTED'],
      'REJECTED': []
    };

    if (!validTransitions[previousStatus].includes(newStatus)) {
      return res.status(400).json({
        status: "ERROR",
        message: `Cannot change status from ${previousStatus} to ${newStatus}`
      });
    }

    const updatedRequest = await prisma.investment_requests.update({
      where: { request_id: parseInt(investment_id) },
      data: { request_status: newStatus }
    });

    if (previousStatus === 'OPEN' && newStatus === 'APPROVED') {
      await prisma.investments.create({
        data: {
          amount: updatedRequest.amount,
          title: updatedRequest.title,
          description: updatedRequest.description,
          shopname: updatedRequest.shop_name,
          updated_by: parseInt(userId)
        }
      });
      return res.json({ status: "SUCCESS", message: "Investment approved and added successfully" });
    }

    if (previousStatus === 'OPEN' && newStatus === 'REJECTED') {
      return res.json({ status: "SUCCESS", message: "Investment request rejected" });
    }

    if (previousStatus === 'APPROVED' && newStatus === 'REJECTED') {
      const existingInvestment = await prisma.investments.findFirst({
        where: {
          title: updatedRequest.title,
          shopname: updatedRequest.shop_name,
          amount: updatedRequest.amount
        }
      });

      if (existingInvestment) {
        await prisma.investments.delete({
          where: { investment_id: existingInvestment.investment_id }
        });
        return res.json({ status: "SUCCESS", message: "Investment rejected and removed successfully" });
      } else {
        return res.status(500).json({
          status: "ERROR",
          message: "Data inconsistency: Investment not found for approved request"
        });
      }
    }

    return res.json({ status: "SUCCESS", message: "Status updated successfully" });

  } catch (error) {
    console.error("Error updating investment request:", error);
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
};

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
    return res.status(500).json({status: "ERROR", message: error.message} );
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


exports.updateMemberStatus = async (req, res) => {
  try {
    const { user_id, status } = req.params;
    console.log("Update Member Status - UserID: ", req.params);
    console.log("status : ", status)
    if (!user_id || typeof status === 'undefined') {
      return res.status(400).json({ status: "ERROR", message: "User ID and status are required" });
    }

    const statusValue = !(status === "inactive");
    console.log("statusValue : ", statusValue)
    const user = await prisma.users.findUnique({
      where: { user_id: parseInt(user_id) }
    });

    if (!user) {
      return res.status(404).json({ status: "ERROR", message: "User not found" });
    }

    const updatedUser = await prisma.users.update({
      where: { user_id: parseInt(user_id) },
      data: { status: statusValue }
    });

    if(!updatedUser) {
      return res.status(500).json({ status: "ERROR", message: "Failed to update user status" });
    }

    return res.json({ status: "SUCCESS", message: `User ${updatedUser.firstname} ${updatedUser.lastname} has been ${status ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
}