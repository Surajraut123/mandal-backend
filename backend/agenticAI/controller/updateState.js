export const updateState = (state, action, data) => {
    if (!data) return state;
  
    if (action && action !== "NO_ACTION") {
      state.currentAction = action;
    }
  
    if (data.donorName)  state.collected.donorName  = data.donorName;
    if (data.amount)     state.collected.amount      = data.amount;
    if (data.userId)     state.collected.userId      = data.userId;
    if (data.phone_no)   state.collected.phone_no    = data.phone_no;
    if (data.title)      state.collected.title       = data.title;
    if (data.shopName)   state.collected.shopName    = data.shopName;
    if (data.description)state.collected.description = data.description;
  
    return state;
}