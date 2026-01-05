const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middleWare/auth.middleware');


const {
    checkHealth,
    userRegistration,
    userLogin,
    contributions,
    getContributedUsers,
    getMandalMembers,
    requestContributionToAddInMandal,
    fetchContributionRequests,
    updateContributionRequestStatus,
    addMandalInvestment,
    updateMandalInvestment

} = require('../controllers/mandal.controller');

router.get('/health', checkHealth);
router.post('/register', userRegistration);
router.post('/login', userLogin);
router.post('/mandal-contribution', verifyToken, contributions);
router.get('/contributed-users', verifyToken, getContributedUsers);
router.get('/mandal-members', verifyToken, getMandalMembers);
router.post('/request-contribution', verifyToken, requestContributionToAddInMandal);
router.get('/fetch-requests', verifyToken, fetchContributionRequests);
router.patch('/contribution-request/:contribution_id/:status/:userId', verifyToken, authorizeRoles("treasurer") , updateContributionRequestStatus);
router.post('/mandal-investment', verifyToken, authorizeRoles("member", "treasurer", "admin") , addMandalInvestment);
router.post('/update-mandal-investment/:investment_id', verifyToken, authorizeRoles("member", "treasurer", "admin") , updateMandalInvestment);


module.exports = router;