// Database module barrel file
// Re-exports all database operations from domain-specific modules

export { pool, healthCheck, gracefulShutdown } from './pool';

// Users
export {
  getUserByTwitterHandle,
  getUserById,
  getUserByTwitterId,
  createUser,
  getUserByWallet,
  getUserByPumpFunUsername,
  createUserFromWallet,
  linkTwitterToUser,
  unlinkTwitterFromUser,
  updateUser,
  searchUsers,
} from './users';

// Wallets
export {
  getWalletsByUserId,
  getWalletByAddress,
  createWallet,
  deleteWallet,
  setWalletPrimary,
} from './wallets';

// Tokens
export {
  getTokensByCreatorWallet,
  getTokensByUserId,
  getTokenByMint,
  upsertToken,
  getTokensForUserWallets,
} from './tokens';

// KOLs
export {
  getKolByWallet,
  getKolByUserId,
  getAllKols,
  getKolsWithUsers,
  upsertKol,
  linkKolToUser,
  getKolCount,
  isUserKol,
  getKolStatusForUsers,
} from './kols';
export type { KolWithUser } from './kols';

// Leaderboard
export {
  getLeaderboard,
  updateRanks,
  updateUserRank,
} from './leaderboard';

// Score History
export {
  getScoreHistory,
  addScoreHistory,
} from './score-history';

// Profile Views
export {
  recordProfileView,
  getProfileViewCount,
} from './profile-views';

// System User (deprecated)
export { getOrCreateSystemUser } from './system-user';
