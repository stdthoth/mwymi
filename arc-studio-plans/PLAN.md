## Implementation Plan: MWYMI – Last Man Standing

### Summary
A private survivor pool for NFL picks on Arc Testnet. A creator sets a fixed USDC buy-in and season length and shares an invite link. Each week every player picks one team to win, with no team reusable. Losers are eliminated, and the last player standing (or the survivors at season end) splits the escrowed pot. Results come from a mock panel for now; later modes build on the same app.

### Rules (locked)
- Pool setup: creator sets fixed USDC buy-in and season length (2-18 weeks). Players join with an invite link/code. Creator auto-joins and pays the buy-in. 2-32 players.
- Start: creator starts once at least 2 players have joined. Before start, creator can cancel and players can refund.
- Picks: one team per week from 32 NFL teams. A team already used cannot be picked again. Pick can be changed until the week is resolved.
- Resolution: mock results panel; anyone can resolve a week (intentional for demo/testing).
- Loss or tie: eliminated (tie counts as a loss).
- Missed pick: free strike, team stays available. Two strikes eliminate.
- One player left: takes the pot.
- Everyone eliminated in the same week: pot split evenly among everyone alive going into that week.
- Season end with more than one alive: survivors split the pot.
- Payouts are pull-based claims; rounding dust goes to the first winner.
- Mock schedule: all 32 teams play every week as 16 mock matchups; no bye weeks.

### Architecture
- Blockchain: Arc Testnet (chain ID 5042002). USDC (0x3600000000000000000000000000000000000000, 6 decimals) is both buy-in and gas token.
- Contract: single LastManStanding.sol holding all pools, each with its own escrow. Functions: createPool(buyIn, totalWeeks, codeHash), joinPool(poolId, code), startPool, cancelPool, refund, submitPick(poolId, teamId), resolveWeek(poolId, winnersMask), claim(poolId), plus views (pool, players, per-player state, week results). Reentrancy guard, safe token transfers, bounded player loop. Immutable mockResults flag: when true anyone can resolve; when false only a designated resolver can, so a real results source can replace the mock later.
- Frontend: Vite + React + TypeScript + Tailwind, wagmi + viem + ConnectKit, TanStack Query. Screens: pool list, create pool, join via invite, pool view (pick grid, players, mock results panel, claim banner). Teams shown as abbreviation/color chips, no logos.
- Wallet: ConnectKit (injected + WalletConnect), Arc Testnet only, RPC passed explicitly.

### Files to Create/Modify
Repo currently only has README.md, so a Vite project is scaffolded at the repo root (approved by the build request).
1. contracts/LastManStanding.sol - multi-pool escrow contract with the rules above.
2. package.json, vite.config.ts, tsconfig.json, postcss.config.js, tailwind.config.ts, index.html, .gitignore - project scaffold (.gitignore excludes .env* and node_modules).
3. .env - public VITE_ values: Arc Testnet RPC, USDC address, contract address, WalletConnect project ID.
4. src/main.tsx, src/index.css - entry and Tailwind base.
5. src/config/arc.ts - Arc Testnet chain, USDC address, explorer links, env reads.
6. src/config/wagmi.ts - wagmi + ConnectKit provider setup.
7. src/abi/lastManStanding.ts - contract ABI from compiled output.
8. src/abi/erc20.ts - minimal USDC ABI (approve, allowance, balanceOf).
9. src/data/nflTeams.ts - 32 teams: id, abbreviation, name, color.
10. src/lib/mockSchedule.ts - deterministic weekly pairing into 16 games; winners-mask builder.
11. src/lib/invite.ts - invite code generation, hashing, invite link build/parse.
12. src/lib/format.ts - USDC formatting (6 decimals), address shortening, explorer links.
13. src/hooks/usePools.ts - connected wallet's pools and pool lookup by id.
14. src/hooks/usePool.ts - pool state, players, per-player state, week history.
15. src/hooks/useUsdcApproval.ts - balance/allowance reads and approve-then-act flow.
16. src/components/Header.tsx - logo, USDC balance, ConnectKit button.
17. src/components/CreatePoolForm.tsx - buy-in, season length, approve, create, invite link.
18. src/components/JoinPoolCard.tsx - invite pool details, approve and join.
19. src/components/PoolList.tsx - "My pools" with status, week, pot.
20. src/components/PoolView.tsx - pool shell: status, pot, week tracker, creator actions (start, cancel).
21. src/components/PlayerList.tsx - alive/strikes/eliminated status and winner.
22. src/components/PickBoard.tsx - 32-team grid, used teams disabled, confirm pick.
23. src/components/MockResultsPanel.tsx - 16 matchups, choose winner or tie, randomize, resolve week.
24. src/components/WeekHistory.tsx - past weeks with winning teams and survivors left.
25. src/components/PayoutBanner.tsx - final result, each winner's share, claim button.
26. src/components/TxStatus.tsx - pending/success/error with explorer link.
27. src/App.tsx - view switching via ?pool= and &code= query params (no router).
28. README.md - replace stub with setup, rules, testnet-only and mock-results note.

### Build Sequence
1. Write the contract, compile it, and review it for fund-safety and rule bugs (payout math, strike logic, used-team mask, refund/cancel paths, bounded loop).
2. Write unit tests: lone winner, all-out split, season-end split, tie counts as loss, strike elimination, team reuse blocked, refund after cancel, wrong join code, double claim. Fix anything found.
3. Deploy to Arc Testnet; record the address in .env and copy the ABI to src/abi/lastManStanding.ts.
4. Scaffold Vite + Tailwind + wagmi/ConnectKit; add Arc config and providers.
5. Add team data, mock schedule, invite helpers.
6. Build create, join, and pool list flows (approve first, then action, with clear tx states).
7. Build the pool view: player list, pick board, creator controls, week tracker.
8. Build the mock results panel and week history; wire resolveWeek.
9. Build payout banner and claim flow, including cancel/refund states.
10. Polish UI; add loading, empty and error states; add faucet and testnet notices.
11. End-to-end check in the preview with two wallets; update README.md.

### Done When
- [ ] Contract is deployed on Arc Testnet and the UI reads/writes it.
- [ ] A creator can create a pool (buy-in, 2-18 weeks) and gets a working invite link.
- [ ] A second wallet can join via the link; a wrong code is rejected.
- [ ] Creator can start with at least 2 players or cancel; players can then refund.
- [ ] Players can pick and change a team within the week; a previously used team is blocked.
- [ ] A missed pick gives 1 strike without using up a team; a second strike eliminates.
- [ ] A loss or tie eliminates the player.
- [ ] Anyone can resolve a week from the mock panel.
- [ ] Lone survivor, all-out week, and season-end finish each pay out as specified, with claims that cannot repeat.
- [ ] Pot is conserved: no USDC stuck or double-paid.
- [ ] Everything runs on Arc Testnet; no mainnet address or setting appears anywhere.

## Ready to build?
