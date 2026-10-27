// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LastManStanding} from "../LastManStanding.sol";
import {LastManStandingTestBase} from "./LastManStanding.Base.t.sol";

contract LastManStandingFuzzTest is LastManStandingTestBase {
    address[] internal players;

    function _setupPlayers(uint256 n, uint96 buyIn, uint8 weeks_) internal returns (uint256 id) {
        players.push(creator);
        id = _create(creator, buyIn, weeks_);
        for (uint256 i = 1; i < n; ++i) {
            address p = address(uint160(0x20000 + i));
            _fund(p);
            players.push(p);
            _join(id, p);
        }
        _start(id);
    }

    function testFuzz_SingleSurvivorTakesWholePot(uint256 n, uint96 buyIn, uint256 winnerIdx) public {
        n = bound(n, 2, 32);
        buyIn = uint96(bound(buyIn, 1, 1e10));
        winnerIdx = bound(winnerIdx, 0, n - 1);
        uint256 id = _setupPlayers(n, buyIn, WEEKS);
        for (uint256 i; i < n; ++i) {
            _pick(id, players[i], uint8(i));
        }
        _resolve(id, uint32(1) << uint8(winnerIdx));

        assertTrue(_status(id) == LastManStanding.Status.Finished);
        assertEq(lms.getPool(id).winnerCount, 1);
        assertEq(_claim(id, players[winnerIdx]), n * uint256(buyIn));
        assertEq(usdc.balanceOf(address(lms)), 0);
    }

    /// Two-week pool, arbitrary win masks each week. Checks payouts against an independent model.
    function testFuzz_PotConservationAndDust(uint256 n, uint96 buyIn, uint32 mask1, uint32 mask2) public {
        n = bound(n, 2, 32);
        buyIn = uint96(bound(buyIn, 1, 1e10));
        uint256 id = _setupPlayers(n, buyIn, 2);
        uint256 pot = n * uint256(buyIn);

        bool[] memory win = new bool[](n); // expected winners
        uint256 alive1;
        for (uint256 i; i < n; ++i) {
            _pick(id, players[i], uint8(i));
            if ((mask1 >> i) & 1 == 1) alive1++;
        }
        _resolve(id, mask1);

        if (alive1 == 0) {
            for (uint256 i; i < n; ++i) win[i] = true;
        } else if (alive1 == 1) {
            for (uint256 i; i < n; ++i) win[i] = (mask1 >> i) & 1 == 1;
        } else {
            assertTrue(_status(id) == LastManStanding.Status.Active);
            uint256 alive2;
            for (uint256 i; i < n; ++i) {
                if ((mask1 >> i) & 1 == 0) continue;
                uint8 t = uint8((i + 16) % 32);
                _pick(id, players[i], t);
                if ((mask2 >> t) & 1 == 1) alive2++;
            }
            _resolve(id, mask2);
            for (uint256 i; i < n; ++i) {
                bool in1 = (mask1 >> i) & 1 == 1;
                bool survives = in1 && ((mask2 >> uint8((i + 16) % 32)) & 1 == 1);
                win[i] = alive2 == 0 ? in1 : survives;
            }
        }

        assertTrue(_status(id) == LastManStanding.Status.Finished);
        uint256 winners;
        int256 first = -1;
        for (uint256 i; i < n; ++i) {
            assertEq(_isWinner(id, players[i]), win[i], "winner set mismatch");
            if (win[i]) {
                winners++;
                if (first < 0) first = int256(i);
            }
        }
        assertGe(winners, 1);
        LastManStanding.PoolView memory p = lms.getPool(id);
        assertEq(p.winnerCount, winners);
        assertEq(p.winnerShare, pot / winners);

        uint256 sum;
        for (uint256 i; i < n; ++i) {
            uint256 expected = win[i] ? pot / winners + (uint256(first) == i ? pot % winners : 0) : 0;
            assertEq(lms.claimable(id, players[i]), expected, "claimable");
            if (win[i]) sum += _claim(id, players[i]);
        }
        assertEq(sum, pot, "payouts must equal pot");
        assertEq(usdc.balanceOf(address(lms)), 0, "contract drained");
    }

    function testFuzz_RefundReturnsExactBuyIns(uint256 n, uint96 buyIn) public {
        n = bound(n, 1, 32);
        buyIn = uint96(bound(buyIn, 1, 1e10));
        players.push(creator);
        uint256 id = _create(creator, buyIn, WEEKS);
        for (uint256 i = 1; i < n; ++i) {
            address p = address(uint160(0x30000 + i));
            _fund(p);
            players.push(p);
            _join(id, p);
        }
        skip(3 days);
        vm.prank(stranger);
        lms.cancelPool(id);
        for (uint256 i; i < n; ++i) {
            vm.prank(players[i]);
            lms.refund(id);
            assertEq(usdc.balanceOf(players[i]), 1_000_000e6);
        }
        assertEq(usdc.balanceOf(address(lms)), 0);
    }

    function testFuzz_CancelTimeoutBoundary(uint256 dt) public {
        dt = bound(dt, 0, 10 days);
        uint256 id = _create(creator, BUY_IN, WEEKS);
        skip(dt);
        vm.prank(stranger);
        if (dt < 3 days) vm.expectRevert(LastManStanding.NotCreator.selector);
        lms.cancelPool(id);
    }

    function testFuzz_TeamReuseAlwaysReverts(uint8 team) public {
        team = uint8(bound(team, 0, 31));
        uint256 id = _active2(WEEKS);
        _pick(id, creator, team);
        _pick(id, alice, (team + 1) % 32);
        _resolve(id, (uint32(1) << team) | (uint32(1) << ((team + 1) % 32)));
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(LastManStanding.TeamAlreadyUsed.selector, team));
        lms.submitPick(id, team);
    }
}
