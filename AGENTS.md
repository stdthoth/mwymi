# MWYMI agent notes

- Game mode 1: Last Man Standing (NFL survivor pool). Contract: `contracts/LastManStanding.sol`, tests in `contracts/test/`.
- Deployed on Arc Testnet: `0x2cad6aa2182be5f2ae47d73fa10c716f6f136b33` (constructor: USDC `0x3600000000000000000000000000000000000000`, mockResults=true, resolver = platform deployer wallet). Address is in `.env` as `VITE_LMS_ADDRESS`.
- `mockResults=true`: anyone can resolve a week from the Mock results panel. Testnet demo only. For real results, redeploy with mockResults=false and a trusted resolver.
- Team ids 0..31 in `src/data/nflTeams.ts` match contract bit positions. Never reorder.
- Invite code is a bytes32 kept in the URL #fragment; only its hash is onchain. Creator's browser stores it in localStorage to rebuild the link.
- Known limits accepted: invite codes are visible in join calldata; no pick deadline (picks editable until a week is resolved); no bye weeks in the mock schedule.
- Open pools can be cancelled by anyone after 3 days so buy-ins can never be locked.
