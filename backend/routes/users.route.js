const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middleWare/auth.middleware');


const { 
    handleAgent
} = require('../agenticAI/controller/agent.controller');

const {
    checkHealth,
    userRegistration,
    userLogin,
    contributions,
    getContributedUsers,
    getMandalMembers,
    requestContributionToAddInMandal,
    fetchContributionRequests,
    fetchInvestmentRequests,
    updateContributionRequestStatus,
    addMandalInvestment,
    updateMandalInvestment,
    fetchMandalInvestments,
    requestInvestmentToAddInMandal,
    updateInvestmentRequestStatus,
    authCheck,
    logout,
    sendEmailOTP,
    verifyEmailOTP,
    resetPassword,
    fetchProfile,
    updateProfile,
    updateMemberStatus

} = require('../controllers/mandal.controller');

const upload = require('../middleWare/upload');

router.get('/health', checkHealth);
router.post('/register', userRegistration);
router.post('/login', userLogin);

router.post('/verify-email', sendEmailOTP);
router.post('/verify-email-otp', verifyEmailOTP);
router.post('/reset-password', resetPassword);

router.post('/logout', verifyToken, logout);

router.get('/auth-check', verifyToken, authCheck);

router.get('/profile', verifyToken, fetchProfile);
router.patch('/update-profile', verifyToken, upload.single("profileImage"), updateProfile);

router.post('/mandal-contribution', verifyToken, contributions);
router.get('/contributed-users', verifyToken, getContributedUsers);
router.get('/mandal-members', verifyToken, getMandalMembers);

router.post('/request-contribution', verifyToken, requestContributionToAddInMandal);
router.post('/request-investment', verifyToken, requestInvestmentToAddInMandal);

router.get('/fetch-requests', verifyToken, fetchContributionRequests);
router.get('/fetch-investment-requests', verifyToken, fetchInvestmentRequests);

router.patch('/contribution-request/:contribution_id/:status', verifyToken, authorizeRoles("treasurer") , updateContributionRequestStatus);
router.patch('/investment-request/:investment_id/:status', verifyToken, authorizeRoles("treasurer") , updateInvestmentRequestStatus);

router.post('/mandal-investment', verifyToken, authorizeRoles("member", "treasurer", "admin") , addMandalInvestment);
router.post('/update-mandal-investment/:investment_id', verifyToken, authorizeRoles("member", "treasurer", "admin") , updateMandalInvestment);

router.get('/fetch_investments', verifyToken, authorizeRoles("member", "treasurer", "admin") , fetchMandalInvestments);

router.patch('/update-member-status/:user_id/:status', verifyToken, authorizeRoles("admin") , updateMemberStatus);

router.post('/ask-ai', verifyToken, handleAgent)


module.exports = router;