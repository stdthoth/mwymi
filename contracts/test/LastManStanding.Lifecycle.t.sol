// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LastManStanding} from "../LastManStanding.sol";
import {LastManStandingTestBase} from "./LastManStanding.Base.t.sol";

contract LastManStandingLifecycleTest is LastManStandingTestBase {
    // ---------------------------------------------------------------- constructor
    function test_Constructor_StoresImmutables() public {
        assertEq(address(lms.usdc()), address(usdc));
        assertTrue(lms.mockResults());
        assertEq(lms.resolver(), resolver);
        assertEq(lms.poolCount(), 0);
    }

    function test_Constructor_RevertsOnZeroToken() public {
        vm.expectRevert(LastManStanding.ZeroAddress.selector);
        new LastManStanding(IERC20(address(0)), true, resolver);
    }

    function test_Constructor_RevertsOnZeroResolver() public {
        vm.expectRevert(LastManStanding.ZeroAddress.selector);
        new LastManStanding(IERC20(address(usdc)), true, address(0));
    }

    // ---------------------------------------------------------------- createPool
    function test_CreatePool_HappyPath() public {
        uint256 before = usdc.balanceOf(creator);
        uint256 id = _create(creator, BUY_IN, WEEKS);
        assertEq(id, 1);
        assertEq(lms.poolCount(), 1);

        LastManStanding.PoolView memory p = lms.getPool(id);
        assertEq(p.creator, creator);
        assertEq(p.buyIn, BUY_IN);
        assertEq(p.totalWeeks, WEEKS);
        assertEq(p.currentWeek, 0);
        assertTrue(p.status == LastManStanding.Status.Open);
        assertEq(p.codeHash, _codeHash());
        assertEq(p.pot, BUY_IN);
        assertEq(p.createdAt, block.timestamp);

        address[] memory players = lms.getPlayers(id);
        assertEq(players.length, 1);
        assertEq(players[0], creator);
        (bool joined,,,,,,,) = lms.getPlayerState(id, creator);
        assertTrue(joined);
        assertEq(usdc.balanceOf(creator), before - BUY_IN);
        assertEq(usdc.balanceOf(address(lms)), BUY_IN);
        assertEq(lms.getPoolsOf(creator).length, 1);
        assertEq(lms.poolsByPlayer(creator, 0), id);
    }

    function test_CreatePool_EmitsEvents() public {
        vm.expectEmit(true, true, false, true, address(lms));
        emit LastManStanding.PoolCreated(1, creator, BUY_IN, WEEKS, _codeHash());
        vm.expectEmit(true, true, false, true, address(lms));
        emit LastManStanding.PlayerJoined(1, creator);
        _create(creator, BUY_IN, WEEKS);
    }

    function test_CreatePool_RevertsZeroBuyIn() public {
        vm.prank(creator);
        vm.expectRevert(LastManStanding.InvalidBuyIn.selector);
        lms.createPool(0, WEEKS, _codeHash());
    }

    function test_CreatePool_RevertsWeeksBelowMin() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(LastManStanding.InvalidTotalWeeks.selector, uint8(1)));
        lms.createPool(BUY_IN, 1, _codeHash());
    }

    function test_CreatePool_RevertsWeeksAboveMax() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(LastManStanding.InvalidTotalWeeks.selector, uint8(19)));
        lms.createPool(BUY_IN, 19, _codeHash());
    }

    function test_CreatePool_AcceptsWeekBounds() public {
        _create(creator, BUY_IN, 2);
        _create(creator, BUY_IN, 18);
        assertEq(lms.poolCount(), 2);
    }

    function test_CreatePool_RevertsEmptyCodeHash() public {
        vm.prank(creator);
        vm.expectRevert(LastManStanding.EmptyCodeHash.selector);
        lms.createPool(BUY_IN, WEEKS, bytes32(0));
    }

    function test_CreatePool_RevertsWithoutAllowance() public {
        address broke = _addr("broke");
        usdc.mint(broke, 100e6);
        vm.prank(broke);
        vm.expectRevert();
        lms.createPool(BUY_IN, WEEKS, _codeHash());
    }

    // ---------------------------------------------------------------- joinPool
    function test_JoinPool_HappyPath() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        uint256 before = usdc.balanceOf(alice);

        vm.expectEmit(true, true, false, true, address(lms));
        emit LastManStanding.PlayerJoined(id, alice);
        _join(id, alice);

        assertEq(usdc.balanceOf(alice), before - BUY_IN);
        assertEq(usdc.balanceOf(address(lms)), 2 * uint256(BUY_IN));
        assertEq(lms.getPool(id).pot, 2 * uint256(BUY_IN));
        address[] memory players = lms.getPlayers(id);
        assertEq(players.length, 2);
        assertEq(players[1], alice);
        (bool joined, bool alive,,,,,,) = lms.getPlayerState(id, alice);
        assertTrue(joined);
        assertFalse(alive); // alive only after start
        assertEq(lms.getPoolsOf(alice).length, 1);
    }

    function test_JoinPool_RevertsWrongCode() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        vm.prank(alice);
        vm.expectRevert(LastManStanding.InvalidCode.selector);
        lms.joinPool(id, bytes32(uint256(0xBAD)));
    }

    function test_JoinPool_RevertsTwice() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        _join(id, alice);
        vm.prank(alice);
        vm.expectRevert(LastManStanding.AlreadyJoined.selector);
        lms.joinPool(id, CODE);
    }

    function test_JoinPool_CreatorCannotJoinAgain() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        vm.prank(creator);
        vm.expectRevert(LastManStanding.AlreadyJoined.selector);
        lms.joinPool(id, CODE);
    }

    function test_JoinPool_PoolFullAt32() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        for (uint256 i = 1; i < 32; ++i) {
            address p = address(uint160(0x10000 + i));
            _fund(p);
            _join(id, p);
        }
        assertEq(lms.getPlayers(id).length, 32);
        assertEq(lms.getPool(id).pot, 32 * uint256(BUY_IN));

        vm.prank(alice);
        vm.expectRevert(LastManStanding.PoolFull.selector);
        lms.joinPool(id, CODE);
        assertEq(lms.getPlayers(id).length, 32);
    }

    function test_JoinPool_RevertsNonexistentPool() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LastManStanding.PoolNotFound.selector, uint256(7)));
        lms.joinPool(7, CODE);
    }

    function test_JoinPool_RevertsAfterStart() public {
        uint256 id = _active2(WEEKS);
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                LastManStanding.InvalidStatus.selector, LastManStanding.Status.Open, LastManStanding.Status.Active
            )
        );
        lms.joinPool(id, CODE);
    }

    // ---------------------------------------------------------------- startPool
    function test_StartPool_HappyPath() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        _join(id, alice);
        vm.expectEmit(true, false, false, false, address(lms));
        emit LastManStanding.PoolStarted(id);
        _start(id);

        LastManStanding.PoolView memory p = lms.getPool(id);
        assertTrue(p.status == LastManStanding.Status.Active);
        assertEq(p.currentWeek, 1);
        assertTrue(_alive(id, creator));
        assertTrue(_alive(id, alice));
    }

    function test_StartPool_RevertsNonCreator() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        _join(id, alice);
        vm.prank(alice);
        vm.expectRevert(LastManStanding.NotCreator.selector);
        lms.startPool(id);
    }

    function test_StartPool_RevertsWithOnePlayer() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        vm.prank(creator);
        vm.expectRevert(LastManStanding.NotEnoughPlayers.selector);
        lms.startPool(id);
    }

    function test_StartPool_RevertsTwice() public {
        uint256 id = _active2(WEEKS);
        vm.prank(creator);
        vm.expectRevert(
            abi.encodeWithSelector(
                LastManStanding.InvalidStatus.selector, LastManStanding.Status.Open, LastManStanding.Status.Active
            )
        );
        lms.startPool(id);
    }

    // ---------------------------------------------------------------- cancel / refund
    function test_Cancel_ByCreatorThenRefundOnce() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        _join(id, alice);

        vm.expectEmit(true, false, false, false, address(lms));
        emit LastManStanding.PoolCancelled(id);
        vm.prank(creator);
        lms.cancelPool(id);
        assertTrue(_status(id) == LastManStanding.Status.Cancelled);

        uint256 aBefore = usdc.balanceOf(alice);
        vm.expectEmit(true, true, false, true, address(lms));
        emit LastManStanding.Refunded(id, alice, BUY_IN);
        vm.prank(alice);
        lms.refund(id);
        assertEq(usdc.balanceOf(alice), aBefore + BUY_IN);
        (,,,,,,, bool refunded) = lms.getPlayerState(id, alice);
        assertTrue(refunded);

        vm.prank(alice);
        vm.expectRevert(LastManStanding.AlreadyRefunded.selector);
        lms.refund(id);

        vm.prank(creator);
        lms.refund(id);
        assertEq(usdc.balanceOf(address(lms)), 0, "all buy-ins returned");
        assertEq(usdc.balanceOf(creator), 1_000_000e6);
        assertEq(usdc.balanceOf(alice), 1_000_000e6);
    }

    function test_Refund_RevertsForNonMember() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        vm.prank(creator);
        lms.cancelPool(id);
        vm.prank(stranger);
        vm.expectRevert(LastManStanding.NotJoined.selector);
        lms.refund(id);
    }

    function test_Refund_RevertsWhileOpen() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        vm.prank(creator);
        vm.expectRevert(
            abi.encodeWithSelector(
                LastManStanding.InvalidStatus.selector, LastManStanding.Status.Cancelled, LastManStanding.Status.Open
            )
        );
        lms.refund(id);
    }

    function test_Cancel_NonCreatorRevertsBefore3Days() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        skip(3 days - 1);
        vm.prank(stranger);
        vm.expectRevert(LastManStanding.NotCreator.selector);
        lms.cancelPool(id);
    }

    function test_Cancel_NonCreatorSucceedsAfter3Days() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        _join(id, alice);
        skip(3 days);
        vm.prank(stranger);
        lms.cancelPool(id);
        assertTrue(_status(id) == LastManStanding.Status.Cancelled);
        vm.prank(alice);
        lms.refund(id);
        assertEq(usdc.balanceOf(alice), 1_000_000e6);
    }

    function test_Cancel_CreatorCanCancelAnytime() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        skip(30 days);
        vm.prank(creator);
        lms.cancelPool(id);
        assertTrue(_status(id) == LastManStanding.Status.Cancelled);
    }

    function test_Cancel_RevertsOnActivePool() public {
        uint256 id = _active2(WEEKS);
        vm.prank(creator);
        vm.expectRevert(
            abi.encodeWithSelector(
                LastManStanding.InvalidStatus.selector, LastManStanding.Status.Open, LastManStanding.Status.Active
            )
        );
        lms.cancelPool(id);
    }

    function test_Cancel_PreventsJoinAndStart() public {
        uint256 id = _create(creator, BUY_IN, WEEKS);
        vm.prank(creator);
        lms.cancelPool(id);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                LastManStanding.InvalidStatus.selector, LastManStanding.Status.Open, LastManStanding.Status.Cancelled
            )
        );
        lms.joinPool(id, CODE);
    }

    // ---------------------------------------------------------------- views
    function test_GetPool_RevertsForUnknown() public {
        vm.expectRevert(abi.encodeWithSelector(LastManStanding.PoolNotFound.selector, uint256(1)));
        lms.getPool(1);
        vm.expectRevert(abi.encodeWithSelector(LastManStanding.PoolNotFound.selector, uint256(1)));
        lms.getPlayers(1);
        vm.expectRevert(abi.encodeWithSelector(LastManStanding.PoolNotFound.selector, uint256(1)));
        lms.getPlayerState(1, alice);
        vm.expectRevert(abi.encodeWithSelector(LastManStanding.PoolNotFound.selector, uint256(1)));
        lms.getWeekResult(1, 1);
    }

    function test_Claimable_ZeroForUnknownPoolAndOpenPool() public {
        assertEq(lms.claimable(99, alice), 0);
        uint256 id = _create(creator, BUY_IN, WEEKS);
        assertEq(lms.claimable(id, creator), 0);
    }

    function test_PoolsAreIsolated() public {
        uint256 a = _create(creator, BUY_IN, WEEKS);
        uint256 b = _create(alice, 5e6, 3);
        assertEq(a, 1);
        assertEq(b, 2);
        assertEq(lms.getPool(a).pot, BUY_IN);
        assertEq(lms.getPool(b).pot, 5e6);
        assertEq(usdc.balanceOf(address(lms)), uint256(BUY_IN) + 5e6);
    }
}
