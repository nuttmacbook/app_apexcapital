/*
 * YOUR CODE (on-chain). The only door between the UI and the blockchain.
 * The UI (src/project/ui) imports from this file and nothing else on-chain,
 * so contracts can change without touching pages, and pages can change without touching contracts.
 */

// Reads (one per page)
export { getHomeData, getPlanData, getBoardData, getTeamData, getDividendData, AUTO_POSITION } from "./reads";

// Transactions
export { register } from "./intereacts/register";
export { processQueue } from "./intereacts/processQueue";
export { buyRank, buyPrice } from "./intereacts/buyRank";
export { transferWallet } from "./intereacts/transferWallet";
export { dividend, parseRecipients, toUnits } from "./intereacts/dividend";
