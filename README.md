# MWYMI

MWYMI is a sports pick game where players put USDC in escrow. The first mode, Last Man Standing, is an NFL survivor pool: a group picks one team to win each week, a team can only be used once per season, and whoever is left standing splits the pot. It runs on Arc Testnet with test USDC.

Built with [Arc Studio](https://studio.arc.io)

## How the game works

- A creator sets a fixed USDC buy-in and a season length (2 to 18 weeks) and shares a private invite link.
- 2 to 32 players join by paying the buy-in. The creator starts the season, or cancels so everyone can take a refund.
- Each week every player picks one team to win. You cannot pick a team you have already won with.
- A loss or a tie eliminates you. A missed pick is a free strike, and two strikes eliminate you.
- If one player is left, they take the pot. If everyone is out in the same week, the pot is split among everyone who was alive going into that week. If more than one player survives the final week, survivors split the pot.
- Winners claim their share themselves.
- Results are currently entered through a mock panel that anyone can use. This is for testnet demos only; there is no real NFL data or bye weeks yet.

## Tech stack

- Solidity contract (Foundry), OpenZeppelin
- React, TypeScript, Vite, Tailwind CSS
- wagmi, viem, ConnectKit, TanStack Query

## Development

Prerequisites: [Bun](https://bun.sh) and [Foundry](https://book.getfoundry.sh).

```bash
bun install
bun run dev          # start the app on port 5173
bun run build        # typecheck and production build
bun run check        # lint and typecheck
bun run test:contracts   # contract tests (forge test)
```

### Environment variables

Create a `.env` file with these public values:

- `VITE_ARC_TESTNET_RPC_URL`: Arc Testnet RPC endpoint.
- `VITE_USDC_ADDRESS`: USDC token address on Arc Testnet.
- `VITE_LMS_ADDRESS`: deployed Last Man Standing contract address.
