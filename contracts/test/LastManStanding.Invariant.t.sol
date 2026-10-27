// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Vm} from "forge-std/Vm.sol";
import {LastManStanding} from "../LastManStanding.sol";
import {LastManStandingTestBase} from "./LastManStanding.Base.t.sol";

// Deliberately NOT a forge-std Test: its public cheat helpers (deal/tip/hoax...) would be fuzzed as actions.
contract LMSHandler {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    LastManStanding public lms;
    uint256 public poolId;
    address[] internal _players;
    uint256 public ghostClaimed;
    uint256 public resolves;

    constructor(LastManStanding _lms, uint256 _poolId, address[] memory players_) {
        lms = _lms;
        poolId = _poolId;
        for (uint256 i; i < players_.length; ++i) _players.push(players_[i]);
    }

    function pick(uint256 playerSeed, uint8 team) external {
        address p = _players[playerSeed % _players.length];
        team = team % 32;
        vm.prank(p);
        try lms.submitPick(poolId, team) {} catch {}
    }

    function resolve(uint32 mask) external {
        // bias toward few survivors so pools actually finish
        if (resolves % 2 == 0) mask = mask & (mask >> 3);
        resolves++;
        try lms.resolveWeek(poolId, mask) {} catch {}
    }

    function claim(uint256 playerSeed) external {
        address p = _players[playerSeed % _players.length];
        uint256 expected = lms.claimable(poolId, p);
        vm.prank(p);
        try lms.claim(poolId) {
            ghostClaimed += expected;
        } catch {}
    }

    function players() external view returns (address[] memory) {
        return _players;
    }
}

contract LastManStandingInvariantTest is LastManStandingTestBase {
    LMSHandler internal handler;
    uint256 internal id;
    uint256 internal pot;
    address[] internal _targets;

    // forge-std 1.1.2 has no StdInvariant; forge reads this getter directly.
    function targetContracts() public view returns (address[] memory) {
        return _targets;
    }

    function setUp() public override {
        super.setUp();
        address[] memory ps = new address[](5);
        ps[0] = creator;
        ps[1] = alice;
        ps[2] = bob;
        ps[3] = carol;
        ps[4] = stranger;
        id = _create(creator, BUY_IN + 1, 6); // odd buy-in -> dust possible
        _join(id, alice);
        _join(id, bob);
        _join(id, carol);
        _join(id, stranger);
        _start(id);
        pot = 5 * uint256(BUY_IN + 1);
        handler = new LMSHandler(lms, id, ps);
        _targets.push(address(handler));
    }

    // PROPERTY: the contract holds exactly the unclaimed part of the pot, always.
    function invariant_BalanceEqualsPotMinusClaims() public {
        assertEq(usdc.balanceOf(address(lms)), pot - handler.ghostClaimed());
        assertEq(lms.getPool(id).pot, pot);
    }

    // PROPERTY: once finished, claimed + still-claimable == pot (no value created or lost).
    function invariant_FinishedPayoutsSumToPot() public {
        if (_status(id) != LastManStanding.Status.Finished) return;
        address[] memory ps = handler.players();
        uint256 claimable;
        for (uint256 i; i < ps.length; ++i) claimable += lms.claimable(id, ps[i]);
        assertEq(claimable + handler.ghostClaimed(), pot);
        assertEq(usdc.balanceOf(address(lms)), claimable);
    }

    // PROPERTY: while active, at least one player is alive and the week is within the season.
    function invariant_ActivePoolHasLivePlayers() public {
        LastManStanding.PoolView memory p = lms.getPool(id);
        if (p.status != LastManStanding.Status.Active) return;
        assertLe(p.currentWeek, p.totalWeeks);
        address[] memory ps = handler.players();
        uint256 aliveCount;
        for (uint256 i; i < ps.length; ++i) {
            if (_alive(id, ps[i])) aliveCount++;
        }
        assertGe(aliveCount, 2);
    }
}
