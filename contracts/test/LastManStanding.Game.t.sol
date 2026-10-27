// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LastManStanding} from "../LastManStanding.sol";
import {LastManStandingTestBase} from "./LastManStanding.Base.t.sol";

contract LastManStandingGameTest is LastManStandingTestBase {
    function _bit(uint8 t) internal pure returns (uint32) {
        return uint32(1) << t;
    }

    function _wrongStatus(LastManStanding.Status expected, LastManStanding.Status actual)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodeWithSelector(LastManStanding.InvalidStatus.selector, expected, actual);
    }

    // ---------------------------------------------------------------- lone winner
    function test_LoneWinnerTakesWholePot() public {
        uint256 id = _active3(WEEKS);
        uint256 pot = 3 * uint256(BUY_IN);
        _pick(id, creator, 0);
        _pick(id, alice, 1);
        _pick(id, bob, 2);

        vm.expectEmit(true, true, false, true, address(lms));
        emit LastManStanding.WeekResolved(id, 1, _bit(0), 1);
        vm.expectEmit(true, false, false, true, address(lms));
        emit LastManStanding.PoolFinished(id, 1, pot);
        _resolve(id, _bit(0));

        LastManStanding.PoolView memory p = lms.getPool(id);
        assertTrue(p.status == LastManStanding.Status.Finished);
        assertEq(p.winnerCount, 1);
        assertEq(p.winnerShare, pot);
        assertTrue(_isWinner(id, creator));
        assertFalse(_isWinner(id, alice));
        assertEq(lms.claimable(id, creator), pot);
        assertEq(lms.claimable(id, alice), 0);

        vm.expectEmit(true, true, false, true, address(lms));
        emit LastManStanding.Claimed(id, creator, pot);
        assertEq(_claim(id, creator), pot);
        assertEq(usdc.balanceOf(address(lms)), 0);
        assertEq(lms.claimable(id, creator), 0);
    }

    function test_WeekResultRecorded() public {
        uint256 id = _active3(WEEKS);
        (bool r0,,) = lms.getWeekResult(id, 1);
        assertFalse(r0);
        _pick(id, creator, 0);
        _pick(id, alice, 1);
        _pick(id, bob, 2);
        _resolve(id, _bit(0) | _bit(1));
        (bool r, uint32 mask, uint8 surv) = lms.getWeekResult(id, 1);
        assertTrue(r);
        assertEq(mask, _bit(0) | _bit(1));
        assertEq(surv, 2);
        assertEq(lms.getPool(id).currentWeek, 2);
        assertTrue(_status(id) == LastManStanding.Status.Active);
        assertFalse(_alive(id, bob));
    }

    // ---------------------------------------------------------------- all-out week
    function test_AllOutWeek_SplitsAmongGoingInWithDustToFirst() public {
        uint96 buy = 10e6 + 1; // pot = 30_000_003 -> odd for 2 winners
        uint256 id = _create(creator, buy, WEEKS);
        _join(id, alice);
        _join(id, bob);
        _start(id);
        uint256 pot = 3 * uint256(buy);

        // week 1: bob loses, creator + alice survive
        _pick(id, creator, 0);
        _pick(id, alice, 1);
        _pick(id, bob, 2);
        _resolve(id, _bit(0) | _bit(1));
        assertFalse(_alive(id, bob));

        // week 2: both remaining lose -> all-out, winners are the two going in
        _pick(id, creator, 3);
        _pick(id, alice, 4);
        _resolve(id, _bit(10));

        LastManStanding.PoolView memory p = lms.getPool(id);
        assertTrue(p.status == LastManStanding.Status.Finished);
        assertEq(p.winnerCount, 2);
        assertEq(p.winnerShare, pot / 2);
        assertTrue(_isWinner(id, creator));
        assertTrue(_isWinner(id, alice));
        assertFalse(_isWinner(id, bob));
        (,, uint8 surv) = lms.getWeekResult(id, 2);
        assertEq(surv, 0);

        // Claim order should not matter: alice claims first, creator (first in order) still gets dust.
        uint256 a = _claim(id, alice);
        uint256 c = _claim(id, creator);
        assertEq(a, pot / 2);
        assertEq(c, pot / 2 + 1);
        assertEq(a + c, pot);
        assertEq(usdc.balanceOf(address(lms)), 0);
        vm.prank(bob);
        vm.expectRevert(LastManStanding.NotWinner.selector);
        lms.claim(id);
    }

    function test_AllOutWeek_TwoPlayersBothMissTwice() public {
        uint256 id = _active2(WEEKS);
        _resolve(id, 0); // strike 1 each
        assertTrue(_status(id) == LastManStanding.Status.Active);
        assertEq(_strikes(id, creator), 1);
        _resolve(id, 0); // strike 2 each -> all-out, both win
        assertTrue(_status(id) == LastManStanding.Status.Finished);
        assertEq(lms.getPool(id).winnerCount, 2);
        assertEq(_claim(id, creator), BUY_IN);
        assertEq(_claim(id, alice), BUY_IN);
        assertEq(usdc.balanceOf(address(lms)), 0);
    }

    // ---------------------------------------------------------------- season end
    function test_SeasonEnd_SplitsAmongSurvivors() public {
        uint96 buy = 10e6 + 1;
        uint256 id = _create(creator, buy, 2);
        _join(id, alice);
        _join(id, bob);
        _start(id);
        uint256 pot = 3 * uint256(buy);

        _pick(id, creator, 0);
        _pick(id, alice, 1);
        _pick(id, bob, 2);
        _resolve(id, _bit(0) | _bit(1) | _bit(2)); // all survive
        assertTrue(_status(id) == LastManStanding.Status.Active);
        assertEq(lms.getPool(id).currentWeek, 2);

        _pick(id, creator, 5);
        _pick(id, alice, 6);
        _pick(id, bob, 7);
        _resolve(id, _bit(5) | _bit(6) | _bit(7)); // final week, all survive
        assertTrue(_status(id) == LastManStanding.Status.Finished);
        assertEq(lms.getPool(id).winnerCount, 3);

        uint256 total;
        total += _claim(id, bob);
        total += _claim(id, alice);
        uint256 c = _claim(id, creator);
        total += c;
        assertEq(c, pot / 3 + (pot % 3)); // creator is first in order
        assertEq(total, pot);
        assertEq(usdc.balanceOf(address(lms)), 0);
    }

    function test_SeasonEnd_TwoOfThreeSurvive() public {
        uint256 id = _active3(2);
        _pick(id, creator, 0);
        _pick(id, alice, 1);
        _pick(id, bob, 2);
        _resolve(id, _bit(0) | _bit(1) | _bit(2));
        _pick(id, creator, 3);
        _pick(id, alice, 4);
        _pick(id, bob, 5);
        _resolve(id, _bit(4) | _bit(5)); // creator loses in the final week
        assertFalse(_isWinner(id, creator));
        assertTrue(_isWinner(id, alice));
        assertTrue(_isWinner(id, bob));
        assertEq(_claim(id, alice), 15e6);
        assertEq(_claim(id, bob), 15e6);
        assertEq(usdc.balanceOf(address(lms)), 0);
    }

    // ---------------------------------------------------------------- ties / strikes
    function test_TieCountsAsLoss() public {
        uint256 id = _active3(WEEKS);
        _pick(id, creator, 0);
        _pick(id, alice, 1); // tie: team 1 not in winnersMask
        _pick(id, bob, 2);
        _resolve(id, _bit(0) | _bit(2));
        assertTrue(_alive(id, creator));
        assertFalse(_alive(id, alice));
        assertTrue(_alive(id, bob));
        assertEq(_used(id, alice), 0); // no team consumed by a loss
        assertEq(_strikes(id, alice), 0);
    }

    function test_MissedPickGivesStrikeWithoutConsumingTeam() public {
        uint256 id = _active3(WEEKS);
        _pick(id, creator, 0);
        _pick(id, alice, 1);
        // bob misses
        _resolve(id, _bit(0) | _bit(1));
        assertTrue(_alive(id, bob));
        assertEq(_strikes(id, bob), 1);
        assertEq(_used(id, bob), 0);
        assertEq(_used(id, creator), _bit(0));
        assertEq(lms.getPool(id).currentWeek, 2);
        (,, uint8 surv) = lms.getWeekResult(id, 1);
        assertEq(surv, 3);

        // bob can still use any team, since nothing was consumed
        _pick(id, bob, 0);
        _pick(id, creator, 2);
        _pick(id, alice, 3);
        _resolve(id, _bit(0) | _bit(2) | _bit(3));
        assertTrue(_alive(id, bob));
        assertEq(_used(id, bob), _bit(0));
        assertEq(_strikes(id, bob), 1);
    }

    function test_TwoStrikesEliminate() public {
        uint256 id = _active3(WEEKS);
        _pick(id, creator, 0);
        _pick(id, alice, 1);
        _resolve(id, _bit(0) | _bit(1));
        _pick(id, creator, 2);
        _pick(id, alice, 3);
        _resolve(id, _bit(2) | _bit(3));

        assertEq(_strikes(id, bob), 2);
        assertFalse(_alive(id, bob));
        assertTrue(_alive(id, creator));
        assertTrue(_alive(id, alice));
        assertTrue(_status(id) == LastManStanding.Status.Active);
        (,, uint8 surv) = lms.getWeekResult(id, 2);
        assertEq(surv, 2);

        vm.prank(bob);
        vm.expectRevert(LastManStanding.NotAlive.selector);
        lms.submitPick(id, 9);
    }

    function test_PicksDoNotCarryOverBetweenWeeks() public {
        uint256 id = _active3(WEEKS);
        _pick(id, creator, 0);
        _pick(id, alice, 1);
        _pick(id, bob, 2);
        _resolve(id, _bit(0) | _bit(1) | _bit(2));
        // no new picks in week 2 -> everyone takes a strike, nobody is eliminated
        _resolve(id, type(uint32).max);
        assertEq(_strikes(id, creator), 1);
        assertEq(_strikes(id, alice), 1);
        assertEq(_strikes(id, bob), 1);
        assertEq(_used(id, creator), _bit(0));
    }

    // ---------------------------------------------------------------- team reuse / pick changes
    function test_TeamReuseAfterWinningWeekReverts() public {
        uint256 id = _active3(WEEKS);
        _pick(id, creator, 0);
        _pick(id, alice, 1);
        _pick(id, bob, 2);
        _resolve(id, _bit(0) | _bit(1) | _bit(2));

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(LastManStanding.TeamAlreadyUsed.selector, uint8(0)));
        lms.submitPick(id, 0);
        // others' teams are fine
        _pick(id, creator, 1);
    }

    function test_ChangePickBeforeResolution() public {
        uint256 id = _active3(WEEKS);
        _pick(id, creator, 0);
        vm.expectEmit(true, true, true, true, address(lms));
        emit LastManStanding.PickSubmitted(id, creator, 1, 3);
        _pick(id, creator, 3); // replaces team 0
        _pick(id, alice, 1);
        _pick(id, bob, 2);
        _resolve(id, _bit(3) | _bit(1)); // only the replacement pick wins
        assertTrue(_alive(id, creator));
        assertEq(_used(id, creator), _bit(3));
        assertFalse(_alive(id, bob));
    }

    function test_ChangePickToLoserEliminates() public {
        uint256 id = _active3(WEEKS);
        _pick(id, creator, 0);
        _pick(id, creator, 4); // changed away from the winner
        _pick(id, alice, 1);
        _pick(id, bob, 2);
        _resolve(id, _bit(0) | _bit(1) | _bit(2));
        assertFalse(_alive(id, creator));
        assertTrue(_alive(id, alice));
        assertTrue(_alive(id, bob));
    }

    function test_SubmitPick_InvalidTeamReverts() public {
        uint256 id = _active3(WEEKS);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(LastManStanding.InvalidTeam.selector, uint8(32)));
        lms.submitPick(id, 32);
        _pick(id, creator, 31); // highest valid team
    }

    function test_SubmitPick_NonMemberReverts() public {
        uint256 id = _active3(WEEKS);
        vm.prank(stranger);
        vm.expectRevert(LastManStanding.NotJoined.selector);
        lms.submitPick(id, 0);
    }

    function test_SubmitPick_EliminatedReverts() public {
        uint256 id = _active3(WEEKS);
        _pick(id, creator, 0);
        _pick(id, alice, 1);
        _pick(id, bob, 2);
        _resolve(id, _bit(0) | _bit(1));
        vm.prank(bob);
        vm.expectRevert(LastManStanding.NotAlive.selector);
        lms.submitPick(id, 5);
    }

    // ---------------------------------------------------------------- wrong status
    function test_SubmitPick_WrongStatusReverts() public {
        uint256 open = _create(creator, BUY_IN, WEEKS);
        vm.prank(creator);
        vm.expectRevert(_wrongStatus(LastManStanding.Status.Active, LastManStanding.Status.Open));
        lms.submitPick(open, 0);

        uint256 fin = _active2(WEEKS);
        _pick(fin, creator, 0);
        _pick(fin, alice, 1);
        _resolve(fin, _bit(0));
        vm.prank(creator);
        vm.expectRevert(_wrongStatus(LastManStanding.Status.Active, LastManStanding.Status.Finished));
        lms.submitPick(fin, 3);

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(LastManStanding.PoolNotFound.selector, uint256(99)));
        lms.submitPick(99, 0);
    }

    function test_ResolveWeek_WrongStatusReverts() public {
        uint256 open = _create(creator, BUY_IN, WEEKS);
        vm.expectRevert(_wrongStatus(LastManStanding.Status.Active, LastManStanding.Status.Open));
        lms.resolveWeek(open, 1);

        vm.prank(creator);
        lms.cancelPool(open);
        vm.expectRevert(_wrongStatus(LastManStanding.Status.Active, LastManStanding.Status.Cancelled));
        lms.resolveWeek(open, 1);

        uint256 fin = _active2(WEEKS);
        _pick(fin, creator, 0);
        _pick(fin, alice, 1);
        _resolve(fin, _bit(0));
        vm.expectRevert(_wrongStatus(LastManStanding.Status.Active, LastManStanding.Status.Finished));
        lms.resolveWeek(fin, 1);
    }

    // ---------------------------------------------------------------- claim
    function test_Claim_NonWinnerAndDoubleClaimRevert() public {
        uint256 id = _active3(WEEKS);
        _pick(id, creator, 0);
        _pick(id, alice, 1);
        _pick(id, bob, 2);
        _resolve(id, _bit(0));

        vm.prank(alice);
        vm.expectRevert(LastManStanding.NotWinner.selector);
        lms.claim(id);
        vm.prank(stranger);
        vm.expectRevert(LastManStanding.NotWinner.selector);
        lms.claim(id);

        _claim(id, creator);
        vm.prank(creator);
        vm.expectRevert(LastManStanding.AlreadyClaimed.selector);
        lms.claim(id);
        (,,,,,, bool claimed,) = lms.getPlayerState(id, creator);
        assertTrue(claimed);
    }

    function test_Claim_BeforeFinishReverts() public {
        uint256 id = _active3(WEEKS);
        vm.prank(creator);
        vm.expectRevert(_wrongStatus(LastManStanding.Status.Finished, LastManStanding.Status.Active));
        lms.claim(id);
    }

    function test_Claim_NotAvailableOnCancelledPool() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        vm.prank(creator);
        lms.cancelPool(id);
        vm.prank(creator);
        vm.expectRevert(_wrongStatus(LastManStanding.Status.Finished, LastManStanding.Status.Cancelled));
        lms.claim(id);
    }

    // ---------------------------------------------------------------- non-mock mode
    function test_NonMock_OnlyResolverCanResolve() public {
        lms = new LastManStanding(IERC20(address(usdc)), false, resolver);
        _fund(creator);
        _fund(alice);
        uint256 id = _active2(WEEKS);
        _pick(id, creator, 0);
        _pick(id, alice, 1);

        vm.prank(stranger);
        vm.expectRevert(LastManStanding.NotResolver.selector);
        lms.resolveWeek(id, _bit(0));
        vm.prank(creator);
        vm.expectRevert(LastManStanding.NotResolver.selector);
        lms.resolveWeek(id, _bit(0));
        assertTrue(_status(id) == LastManStanding.Status.Active);

        vm.prank(resolver);
        lms.resolveWeek(id, _bit(0));
        assertTrue(_status(id) == LastManStanding.Status.Finished);
        assertEq(_claim(id, creator), 2 * uint256(BUY_IN));
    }

    function test_Mock_AnyoneCanResolve() public {
        uint256 id = _active2(WEEKS);
        _pick(id, creator, 0);
        _pick(id, alice, 1);
        vm.prank(_addr("randomCaller"));
        lms.resolveWeek(id, _bit(1));
        assertTrue(_isWinner(id, alice));
    }
}
