// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LastManStanding
 * @notice MWYMI NFL survivor pools with isolated USDC accounting and pull payouts.
 * @dev Intended token on Arc Testnet: 0x3600000000000000000000000000000000000000
 * (6 decimals). The constructor accepts the token; use only standard, non-rebasing,
 * non-fee-on-transfer USDC. No owner, withdrawal, upgrade, or rescue powers exist.
 * mockResults=true is for testnet demos ONLY. Real use requires mockResults=false
 * and a trusted resolver that publishes correct results at the appropriate time.
 * There are no onchain deadlines: picks remain editable until resolution, and the
 * resolver is responsible for fair timing. Public mock resolution is manipulable.
 * Pool codes are client-chosen bytes32 values committed as keccak256(abi.encode(code)).
 * Only the hash is stored, but join calldata reveals the code: this is not confidential
 * or front-running-resistant membership. Pools, players, and picks are public.
 */
contract LastManStanding is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant NUM_TEAMS = 32;
    uint8 public constant MAX_PLAYERS = 32;
    uint8 public constant MIN_WEEKS = 2;
    uint8 public constant MAX_WEEKS = 18;
    uint8 public constant MAX_STRIKES = 2;
    /// @notice After this long unstarted, anyone may cancel an Open pool so buy-ins can be refunded.
    uint64 public constant OPEN_TIMEOUT = 3 days;

    IERC20 public immutable usdc;
    bool public immutable mockResults;
    address public immutable resolver;
    uint256 public poolCount;

    enum Status { None, Open, Active, Finished, Cancelled }

    struct Pool {
        address creator;
        uint96 buyIn;
        uint8 totalWeeks;
        uint8 currentWeek;
        Status status;
        bytes32 codeHash;
        uint256 pot;
        uint8 winnerCount;
        uint256 winnerShare;
        uint64 createdAt;
        address[] players;
    }

    /// @notice Pool fields without its players array; pot is original contributed principal.
    /// @dev pot remains fixed after admission closes, including after claims/refunds.
    struct PoolView {
        address creator;
        uint96 buyIn;
        uint8 totalWeeks;
        uint8 currentWeek;
        Status status;
        bytes32 codeHash;
        uint256 pot;
        uint8 winnerCount;
        uint256 winnerShare;
        uint64 createdAt;
    }

    struct PlayerState {
        bool joined;
        bool alive;
        uint8 strikes;
        uint32 usedTeams;
        uint8 currentPick;
        bool isWinner;
        bool claimed;
        bool refunded;
    }

    struct WeekResult {
        bool resolved;
        uint32 winnersMask;
        uint8 survivorsAfter;
    }

    mapping(uint256 => Pool) private _pools;
    mapping(uint256 => mapping(address => PlayerState)) private _playerStates;
    mapping(uint256 => mapping(uint8 => WeekResult)) private _weekResults;
    mapping(address => uint256[]) public poolsByPlayer;

    error ZeroAddress();
    error InvalidBuyIn();
    error InvalidTotalWeeks(uint8 totalWeeks);
    error EmptyCodeHash();
    error PoolNotFound(uint256 poolId);
    error InvalidStatus(Status expected, Status actual);
    error NotCreator();
    error PoolFull();
    error AlreadyJoined();
    error InvalidCode();
    error NotEnoughPlayers();
    error NotJoined();
    error AlreadyRefunded();
    error NotAlive();
    error InvalidTeam(uint8 teamId);
    error TeamAlreadyUsed(uint8 teamId);
    error NotResolver();
    error NotWinner();
    error AlreadyClaimed();

    event PoolCreated(
        uint256 indexed poolId, address indexed creator, uint96 buyIn,
        uint8 totalWeeks, bytes32 codeHash
    );
    event PlayerJoined(uint256 indexed poolId, address indexed player);
    event PoolStarted(uint256 indexed poolId);
    event PoolCancelled(uint256 indexed poolId);
    event Refunded(uint256 indexed poolId, address indexed player, uint256 amount);
    event PickSubmitted(
        uint256 indexed poolId, address indexed player, uint8 indexed week, uint8 teamId
    );
    event WeekResolved(
        uint256 indexed poolId, uint8 indexed week, uint32 winnersMask, uint8 survivorsAfter
    );
    event PoolFinished(uint256 indexed poolId, uint8 winnerCount, uint256 winnerShare);
    event Claimed(uint256 indexed poolId, address indexed player, uint256 amount);

    /// @param usdc_ Standard USDC token (six-decimal base units throughout).
    /// @param mockResults_ True only for publicly resolvable testnet demos.
    /// @param resolver_ Trusted results publisher; must be nonzero even in mock mode.
    constructor(IERC20 usdc_, bool mockResults_, address resolver_) {
        if (address(usdc_) == address(0) || resolver_ == address(0)) revert ZeroAddress();
        usdc = usdc_;
        mockResults = mockResults_;
        resolver = resolver_;
    }

    /// @notice Create an open pool and automatically join by paying its buy-in.
    /// @param codeHash Hash of abi.encode(client-chosen bytes32 code), not a raw code.
    function createPool(uint96 buyIn, uint8 totalWeeks, bytes32 codeHash)
        external nonReentrant returns (uint256 poolId)
    {
        if (buyIn == 0) revert InvalidBuyIn();
        if (totalWeeks < MIN_WEEKS || totalWeeks > MAX_WEEKS) {
            revert InvalidTotalWeeks(totalWeeks);
        }
        if (codeHash == bytes32(0)) revert EmptyCodeHash();

        poolId = ++poolCount;
        Pool storage pool = _pools[poolId];
        pool.creator = msg.sender;
        pool.buyIn = buyIn;
        pool.totalWeeks = totalWeeks;
        pool.status = Status.Open;
        pool.codeHash = codeHash;
        pool.createdAt = uint64(block.timestamp);
        emit PoolCreated(poolId, msg.sender, buyIn, totalWeeks, codeHash);
        _join(poolId, pool);
    }

    /// @notice Join an open pool using its bytes32 invitation code and pay USDC.
    /// @dev This transaction exposes the code in public calldata.
    function joinPool(uint256 poolId, bytes32 code) external nonReentrant {
        Pool storage pool = _poolWithStatus(poolId, Status.Open);
        if (pool.players.length >= MAX_PLAYERS) revert PoolFull();
        if (_playerStates[poolId][msg.sender].joined) revert AlreadyJoined();
        if (keccak256(abi.encode(code)) != pool.codeHash) revert InvalidCode();
        _join(poolId, pool);
    }

    /// @notice Creator starts a pool with at least two paid players.
    function startPool(uint256 poolId) external nonReentrant {
        Pool storage pool = _poolWithStatus(poolId, Status.Open);
        if (msg.sender != pool.creator) revert NotCreator();
        uint256 count = pool.players.length;
        if (count < 2) revert NotEnoughPlayers();
        pool.status = Status.Active;
        pool.currentWeek = 1;
        for (uint256 i; i < count; ++i) {
            _playerStates[poolId][pool.players[i]].alive = true;
        }
        emit PoolStarted(poolId);
    }

    /// @notice Creator cancels an unstarted pool; each player can then refund.
    /// @dev Anyone may cancel once OPEN_TIMEOUT has elapsed since creation, so an absent
    /// creator can never lock players' buy-ins.
    function cancelPool(uint256 poolId) external nonReentrant {
        Pool storage pool = _poolWithStatus(poolId, Status.Open);
        if (msg.sender != pool.creator && block.timestamp < uint256(pool.createdAt) + OPEN_TIMEOUT) {
            revert NotCreator();
        }
        pool.status = Status.Cancelled;
        emit PoolCancelled(poolId);
    }

    /// @notice Recover your buy-in from a cancelled pool, exactly once.
    function refund(uint256 poolId) external nonReentrant {
        Pool storage pool = _poolWithStatus(poolId, Status.Cancelled);
        PlayerState storage player = _playerStates[poolId][msg.sender];
        if (!player.joined) revert NotJoined();
        if (player.refunded) revert AlreadyRefunded();
        player.refunded = true;
        emit Refunded(poolId, msg.sender, pool.buyIn);
        usdc.safeTransfer(msg.sender, pool.buyIn);
    }

    /// @notice Submit or replace a pick for the current week using an unused team.
    /// @dev Team use is committed only upon a winning result, not on submission.
    function submitPick(uint256 poolId, uint8 teamId) external nonReentrant {
        Pool storage pool = _poolWithStatus(poolId, Status.Active);
        PlayerState storage player = _playerStates[poolId][msg.sender];
        if (!player.joined) revert NotJoined();
        if (!player.alive) revert NotAlive();
        if (teamId >= NUM_TEAMS) revert InvalidTeam(teamId);
        if ((player.usedTeams & (uint32(1) << teamId)) != 0) revert TeamAlreadyUsed(teamId);
        player.currentPick = teamId + 1;
        emit PickSubmitted(poolId, msg.sender, pool.currentWeek, teamId);
    }

    /// @notice Resolve one week; ties and losing picks eliminate immediately.
    /// @dev Missing picks add a strike; the second strike eliminates. On an all-out
    /// week, winners are exactly those alive going in (their alive flags stay false).
    /// Every loop is bounded by MAX_PLAYERS. No token transfer occurs here.
    function resolveWeek(uint256 poolId, uint32 winnersMask) external nonReentrant {
        Pool storage pool = _poolWithStatus(poolId, Status.Active);
        if (!mockResults && msg.sender != resolver) revert NotResolver();
        uint8 week = pool.currentWeek;
        uint256 count = pool.players.length;
        uint32 goingIn;
        uint8 survivorsAfter;

        for (uint256 i; i < count; ++i) {
            PlayerState storage player = _playerStates[poolId][pool.players[i]];
            if (player.alive) {
                goingIn |= uint32(1) << uint8(i);
                uint8 pick = player.currentPick;
                if (pick == 0) {
                    ++player.strikes;
                    if (player.strikes >= MAX_STRIKES) player.alive = false;
                } else {
                    uint32 teamBit = uint32(1) << (pick - 1);
                    if ((winnersMask & teamBit) != 0) {
                        player.usedTeams |= teamBit;
                    } else {
                        player.alive = false;
                    }
                }
                if (player.alive) ++survivorsAfter;
            }
            player.currentPick = 0;
        }

        _weekResults[poolId][week] = WeekResult(true, winnersMask, survivorsAfter);
        emit WeekResolved(poolId, week, winnersMask, survivorsAfter);

        if (survivorsAfter <= 1 || week == pool.totalWeeks) {
            _finish(poolId, pool, goingIn, survivorsAfter == 0);
        } else {
            pool.currentWeek = week + 1;
        }
    }

    /// @notice Claim your final payout exactly once; no expiry or admin withdrawal.
    /// @dev The first winner in players-array order receives all integer-division dust,
    /// regardless of claim order. pot remains the original principal for accounting.
    function claim(uint256 poolId) external nonReentrant {
        Pool storage pool = _poolWithStatus(poolId, Status.Finished);
        PlayerState storage player = _playerStates[poolId][msg.sender];
        if (!player.isWinner) revert NotWinner();
        if (player.claimed) revert AlreadyClaimed();
        uint256 amount = _winnerPayout(poolId, pool, msg.sender);
        player.claimed = true;
        emit Claimed(poolId, msg.sender, amount);
        usdc.safeTransfer(msg.sender, amount);
    }

    /// @notice Return all scalar pool fields; reverts for nonexistent pools.
    function getPool(uint256 poolId) external view returns (PoolView memory result) {
        Pool storage pool = _existingPool(poolId);
        result = PoolView({
            creator: pool.creator,
            buyIn: pool.buyIn,
            totalWeeks: pool.totalWeeks,
            currentWeek: pool.currentWeek,
            status: pool.status,
            codeHash: pool.codeHash,
            pot: pool.pot,
            winnerCount: pool.winnerCount,
            winnerShare: pool.winnerShare,
            createdAt: pool.createdAt
        });
    }

    /// @notice Return joined players in admission order (at most MAX_PLAYERS).
    function getPlayers(uint256 poolId) external view returns (address[] memory) {
        return _existingPool(poolId).players;
    }

    /// @notice Return a player's state; nonmembers have zero/default values.
    function getPlayerState(uint256 poolId, address player) external view returns (
        bool joined, bool alive, uint8 strikes, uint32 usedTeams,
        uint8 currentPick, bool isWinner, bool claimed, bool refunded
    ) {
        _existingPool(poolId);
        PlayerState storage state = _playerStates[poolId][player];
        return (
            state.joined, state.alive, state.strikes, state.usedTeams,
            state.currentPick, state.isWinner, state.claimed, state.refunded
        );
    }

    /// @notice Unresolved weeks (including out-of-range weeks) return false and zeroes.
    function getWeekResult(uint256 poolId, uint8 week) external view returns (
        bool resolved, uint32 winnersMask, uint8 survivorsAfter
    ) {
        _existingPool(poolId);
        WeekResult storage result = _weekResults[poolId][week];
        return (result.resolved, result.winnersMask, result.survivorsAfter);
    }

    /// @notice Return a wallet's joined pools, including created, closed and cancelled pools.
    /// @dev Full-history view only; use poolsByPlayer(player, index) for indexed reads.
    function getPoolsOf(address player) external view returns (uint256[] memory) {
        return poolsByPlayer[player];
    }

    /// @notice Return the available winner payout, or zero if none (including unknown pools).
    function claimable(uint256 poolId, address player) external view returns (uint256) {
        Pool storage pool = _pools[poolId];
        PlayerState storage state = _playerStates[poolId][player];
        if (pool.status != Status.Finished || !state.isWinner || state.claimed) return 0;
        return _winnerPayout(poolId, pool, player);
    }

    /// @dev Apply admission effects before the external transfer; a failure rolls them back.
    function _join(uint256 poolId, Pool storage pool) private {
        _playerStates[poolId][msg.sender].joined = true;
        pool.players.push(msg.sender);
        poolsByPlayer[msg.sender].push(poolId);
        pool.pot += uint256(pool.buyIn);
        emit PlayerJoined(poolId, msg.sender);
        usdc.safeTransferFrom(msg.sender, address(this), pool.buyIn);
    }

    /// @dev Mark either all survivors or the going-in set on an all-out week.
    function _finish(uint256 poolId, Pool storage pool, uint32 goingIn, bool allOut) private {
        uint8 winners;
        uint256 count = pool.players.length;
        for (uint256 i; i < count; ++i) {
            PlayerState storage player = _playerStates[poolId][pool.players[i]];
            bool wins = allOut ? (goingIn & (uint32(1) << uint8(i))) != 0 : player.alive;
            if (wins) {
                player.isWinner = true;
                ++winners;
            }
        }
        // Active pools always have at least one going-in player.
        pool.status = Status.Finished;
        pool.winnerCount = winners;
        pool.winnerShare = pool.pot / winners;
        emit PoolFinished(poolId, winners, pool.winnerShare);
    }

    /// @dev Called only for an eligible winner of a finished pool; bounded by MAX_PLAYERS.
    function _winnerPayout(uint256 poolId, Pool storage pool, address player)
        private view returns (uint256)
    {
        uint256 amount = pool.winnerShare;
        uint256 count = pool.players.length;
        for (uint256 i; i < count; ++i) {
            address candidate = pool.players[i];
            if (_playerStates[poolId][candidate].isWinner) {
                if (candidate == player) {
                    amount += pool.pot - pool.winnerShare * uint256(pool.winnerCount);
                }
                break;
            }
        }
        return amount;
    }

    function _existingPool(uint256 poolId) private view returns (Pool storage pool) {
        pool = _pools[poolId];
        if (pool.status == Status.None) revert PoolNotFound(poolId);
    }

    function _poolWithStatus(uint256 poolId, Status expected)
        private view returns (Pool storage pool)
    {
        pool = _existingPool(poolId);
        if (pool.status != expected) revert InvalidStatus(expected, pool.status);
    }
}
