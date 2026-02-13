const { getContributedUsers, fetchContributionRequests } = require("../../controllers/mandal.controller");
const { getContributionRequests } = require("../../services/contributionRequest.service");
const { getMandalMembers } = require("../../services/getMandalMemebers.service");
const { getInvestmentRequests } = require("../../services/investmentRequest.service");
const { requestContributionToAdd } = require("../../services/requestContributionToAdd.service");
const { requestInvestmentToAdd } = require("../../services/requestInvestmentToAdd.service");
const { allowedActions } = require("../actions/allowedAction");
const { callGroq } = require("../llmIntegration");
const fs = require('fs');
const path = require('path');
const redisClient = require('../../lib/redis');


const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../workflows/PROMPTWORKFLOW.md'),
  'utf-8'
);
exports.handleAgent = async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = req.user.userId;
    console.log("Received prompt:", prompt);

    const key = `agent:conversation:${userId}`;

    if (!redisClient.isReady) {
      console.log("Redis not ready yet...");
    }

    let history = await redisClient.get(key);
    history = history ? JSON.parse(history) : [];
    
    if (history.length === 0) {
      console.log("Initializing new conversation history with system prompt.");
      history.push({
        role: "system",
        content: SYSTEM_PROMPT
      });
    }

    history.push({
      role: "user",
      content: prompt
    });

    const aiResponse = await callGroq(history);
    const { action, data, status, filters } = aiResponse;

    if (!allowedActions.includes(action)) {
      const errorResponse = {
        action: "NO_ACTION",
        data: { message: aiResponse }
      };
    
      history.push({
        role: "assistant",
        content: JSON.stringify(errorResponse)
      });
    
      await redisClient.set(key, JSON.stringify(history), { EX: 900 });
    
      return res.status(200).json(errorResponse);
    }

    history.push({
      role: "assistant",
      content: JSON.stringify(aiResponse)
    });
    

    let finalResponse = null;
    switch (action) {
      case "ADD_CONTRIBUTION":
        finalResponse = await requestContributionToAdd(
          data.donorName,
          data.amount,
          data.phone_no,
          data.userId
        );
        break;

      case "ADD_INVESTMENT":
        finalResponse = await requestInvestmentToAdd(
          data.shopName,
          data.userId,
          data.amount,
          data.title,
          data.description
        );
        break;

      case "LIST_PENDING_CONTRIBUTION_REQUESTS":
        finalResponse  = await getContributionRequests(status, filters);
        break;
      case "LIST_PENDING_INVESTMENT_REQUESTS":
        finalResponse  = await getInvestmentRequests(status, filters);
        break;
      case "LIST_MEMBERS":
        finalResponse  = await getMandalMembers();
        break;

      case "NO_ACTION":
        finalResponse = aiResponse.data;
        break;

      default:
        return res.status(200).json({
          status: "SUCCESS",
          message: "No Action Performed"
        });
    }

    history.push({
      role: "system",
      content: `SYSTEM ACTION RESULT: ${JSON.stringify(finalResponse)}`
    });  
    
    if (history.length > 30) {
      history = history.slice(-30);
    }
    
    console.log("Current conversation history:", history);
    await redisClient.set(
      key,
      JSON.stringify(history),
      { EX: 900 }
    );

    return res.status(200).json({
      status: "SUCCESS",
      action: aiResponse.action,
      data: finalResponse
    });
    
  } catch (error) {
    console.error("Error handling agent request:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Issue with AI response"
    });
  }
};

  