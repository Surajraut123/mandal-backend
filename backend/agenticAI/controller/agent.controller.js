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
const { buildHistoryToSend } = require("./buildHistoryToSend");
const { updateState } = require("./updateState");


const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../workflows/PROMPTWORKFLOW.md'),
  'utf-8'
);



exports.handleAgent = async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = req.user.userId;

    const historyKey = `agent:conversation:${userId}`;
    const stateKey = `agent:state:${userId}`;

    let history = await redisClient.get(historyKey);
    let state = await redisClient.get(stateKey);

    history = history ? JSON.parse(history) : [];
    state = state ? JSON.parse(state) : { currentAction: null, currentStep: null, collected: {} };

    if (history.length === 0) {
      history.push({ role: "system", content: SYSTEM_PROMPT });
    }

    history.push({ role: "user", content: prompt });

    const historyToSend = buildHistoryToSend(history, state);


    const aiResponse = await callGroq(historyToSend);
    const { action, data, status, filters } = aiResponse;

    state = updateState(state, action, data);

    history.push({ role: "assistant", content: JSON.stringify(aiResponse) });

    if (history.length > 11) {
      history = [history[0], ...history.slice(-10)];
    }

    let finalResponse = null;
    switch (action) {
      case "ADD_CONTRIBUTION":
        finalResponse = await requestContributionToAdd(data.donorName, data.amount, data.phone_no, data.userId);
        state = { currentAction: null, currentStep: null, collected: {} };
        break;

      case "ADD_INVESTMENT":
        finalResponse = await requestInvestmentToAdd(data.shopName, data.userId, data.amount, data.title, data.description);
        state = { currentAction: null, currentStep: null, collected: {} };
        break;

      case "LIST_PENDING_CONTRIBUTION_REQUESTS":
        finalResponse = await getContributionRequests(status, filters);
        break;

      case "LIST_PENDING_INVESTMENT_REQUESTS":
        finalResponse = await getInvestmentRequests(status, filters);
        break;

      case "LIST_MEMBERS":
        finalResponse = await getMandalMembers();
        break;

      case "NO_ACTION":
        finalResponse = aiResponse.data;
        break;

      default:
        return res.status(200).json({ status: "SUCCESS", message: "No Action Performed" });
    }

    history.push({ role: "system", content: `SYSTEM ACTION RESULT: ${JSON.stringify(finalResponse)}` });

    await redisClient.set(historyKey, JSON.stringify(history), { EX: 900 });
    await redisClient.set(stateKey, JSON.stringify(state), { EX: 900 });

    return res.status(200).json({ status: "SUCCESS", action, data: finalResponse });

  } catch (error) {
    console.error("Error handling agent request:", error);
    return res.status(500).json({ status: "ERROR", message: "Issue with AI response" });
  }
};

  