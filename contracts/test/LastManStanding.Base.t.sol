// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LastManStanding} from "../LastManStanding.sol";

contract MockUSDC {
    string public name = "Mock USDC";
    string public symbol = "mUSDC";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
        totalSupply += amt;
        emit Transfer(address(0), to, amt);
    }

    function approve(address spender, uint256 amt) external returns (bool) {
        allowance[msg.sender][spender] = amt;
        emit Approval(msg.sender, spender, amt);
        return true;
    }

    function transfer(address to, uint256 amt) external returns (bool) {
        _move(msg.sender, to, amt);
        return true;
    }

    function transferFrom(address from, address to, uint256 amt) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= amt, "allowance");
        if (a != type(uint256).max) allowance[from][msg.sender] = a - amt;
        _move(from, to, amt);
        return true;
    }

    function _move(address from, address to, uint256 amt) internal {
        require(balanceOf[from] >= amt, "balance");
        balanceOf[from] -= amt;
        balanceOf[to] += amt;
        emit Transfer(from, to, amt);
    }
}

abstract contract LastManStandingTestBase is Test {
    LastManStanding internal lms;
    MockUSDC internal usdc;

    address internal resolver = _addr("resolver");
    address internal creator = _addr("creator");
    address internal alice = _addr("alice");
    address internal bob = _addr("bob");
    address internal carol = _addr("carol");
    address internal stranger = _addr("stranger");

    bytes32 internal constant CODE = bytes32(uint256(0xC0DE));
    uint96 internal constant BUY_IN = 10e6;
    uint8 internal constant WEEKS = 5;

    // forge-std 1.1.2 has no makeAddr; derive a deterministic labelled address.
    function _addr(string memory label) internal returns (address a) {
        a = address(uint160(uint256(keccak256(bytes(label)))));
        vm.label(a, label);
    }

    function setUp() public virtual {
        usdc = new MockUSDC();
        lms = new LastManStanding(IERC20(address(usdc)), true, resolver);
        _fund(creator);
        _fund(alice);
        _fund(bob);
        _fund(carol);
        _fund(stranger);
    }

    function _fund(address who) internal {
        usdc.mint(who, 1_000_000e6);
        vm.prank(who);
        usdc.approve(address(lms), type(uint256).max);
    }

    function _codeHash() internal pure returns (bytes32) {
        return keccak256(abi.encode(CODE));
    }

    function _create(address who, uint96 buyIn, uint8 weeks_) internal returns (uint256 id) {
        vm.prank(who);
        id = lms.createPool(buyIn, weeks_, _codeHash());
    }

    function _join(uint256 id, address who) internal {
        vm.prank(who);
        lms.joinPool(id, CODE);
    }

    function _start(uint256 id) internal {
        vm.prank(creator);
        lms.startPool(id);
    }

    /// creator + alice + bob (3 players), started.
    function _active3(uint8 weeks_) internal returns (uint256 id) {
        id = _create(creator, BUY_IN, weeks_);
        _join(id, alice);
        _join(id, bob);
        _start(id);
    }

    /// creator + alice (2 players), started.
    function _active2(uint8 weeks_) internal returns (uint256 id) {
        id = _create(creator, BUY_IN, weeks_);
        _join(id, alice);
        _start(id);
    }

    function _pick(uint256 id, address who, uint8 team) internal {
        vm.prank(who);
        lms.submitPick(id, team);
    }

    function _resolve(uint256 id, uint32 mask) internal {
        vm.prank(stranger); // mock mode: anyone
        lms.resolveWeek(id, mask);
    }

    function _claim(uint256 id, address who) internal returns (uint256 got) {
        uint256 before = usdc.balanceOf(who);
        vm.prank(who);
        lms.claim(id);
        got = usdc.balanceOf(who) - before;
    }

    function _status(uint256 id) internal view returns (LastManStanding.Status) {
        return lms.getPool(id).status;
    }

    function _alive(uint256 id, address who) internal view returns (bool a) {
        (, a,,,,,,) = lms.getPlayerState(id, who);
    }

    function _strikes(uint256 id, address who) internal view returns (uint8 s) {
        (,, s,,,,,) = lms.getPlayerState(id, who);
    }

    function _used(uint256 id, address who) internal view returns (uint32 u) {
        (,,, u,,,,) = lms.getPlayerState(id, who);
    }

    function _isWinner(uint256 id, address who) internal view returns (bool w) {
        (,,,,, w,,) = lms.getPlayerState(id, who);
    }
}
