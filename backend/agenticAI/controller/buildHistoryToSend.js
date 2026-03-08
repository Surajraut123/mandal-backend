export const buildHistoryToSend = (history, state) => {
    const systemPrompt = history[0];
    const recentMessages = history.slice(1).slice(-10);
  
    const stateMessage = {
      role: "system",
      content: `CURRENT CONVERSATION STATE:
      - Active Action: ${state.currentAction || "None"}
      - Current Step: ${state.currentStep || "None"}
      - Collected Data: ${JSON.stringify(state.collected)}
      
      IMPORTANT: Do NOT ask for fields already in Collected Data.`
    };
  
    return [systemPrompt, stateMessage, ...recentMessages];
}