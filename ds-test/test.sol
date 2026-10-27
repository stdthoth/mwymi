// SPDX-License-Identifier: GPL-3.0-or-later
// Minimal local stand-in for dapphub/ds-test, which the npm forge-std@1.1.2 package imports
// but does not ship. Test-support only; not part of the contract under test.
pragma solidity >=0.6.0 <0.9.0;

interface DSVmStore {
    function store(address, bytes32, bytes32) external;
    function load(address, bytes32) external returns (bytes32);
}

contract DSTest {
    event log(string);
    event logs(bytes);
    event log_address(address);
    event log_bytes32(bytes32);
    event log_int(int256);
    event log_uint(uint256);
    event log_bytes(bytes);
    event log_string(string);
    event log_named_address(string key, address val);
    event log_named_bytes32(string key, bytes32 val);
    event log_named_decimal_int(string key, int256 val, uint256 decimals);
    event log_named_decimal_uint(string key, uint256 val, uint256 decimals);
    event log_named_int(string key, int256 val);
    event log_named_uint(string key, uint256 val);
    event log_named_bytes(string key, bytes val);
    event log_named_string(string key, string val);

    bool public IS_TEST = true;
    bool private _failed;

    address internal constant HEVM_ADDRESS = address(bytes20(uint160(uint256(keccak256("hevm cheat code")))));

    function failed() public returns (bool) {
        if (_failed) return true;
        return DSVmStore(HEVM_ADDRESS).load(HEVM_ADDRESS, bytes32("failed")) != bytes32(0);
    }

    function fail() internal virtual {
        DSVmStore(HEVM_ADDRESS).store(HEVM_ADDRESS, bytes32("failed"), bytes32(uint256(1)));
        _failed = true;
    }

    function assertTrue(bool ok) internal {
        if (!ok) {
            emit log("Error: Assertion Failed");
            fail();
        }
    }

    function assertTrue(bool ok, string memory err) internal {
        if (!ok) {
            emit log_named_string("Error", err);
            assertTrue(ok);
        }
    }

    function assertEq(address a, address b) internal {
        if (a != b) {
            emit log("Error: a == b not satisfied [address]");
            emit log_named_address("  Expected", b);
            emit log_named_address("    Actual", a);
            fail();
        }
    }

    function assertEq(address a, address b, string memory err) internal {
        if (a != b) {
            emit log_named_string("Error", err);
            assertEq(a, b);
        }
    }

    function assertEq(bytes32 a, bytes32 b) internal {
        if (a != b) {
            emit log("Error: a == b not satisfied [bytes32]");
            emit log_named_bytes32("  Expected", b);
            emit log_named_bytes32("    Actual", a);
            fail();
        }
    }

    function assertEq(bytes32 a, bytes32 b, string memory err) internal {
        if (a != b) {
            emit log_named_string("Error", err);
            assertEq(a, b);
        }
    }

    function assertEq(int256 a, int256 b) internal {
        if (a != b) {
            emit log("Error: a == b not satisfied [int]");
            emit log_named_int("  Expected", b);
            emit log_named_int("    Actual", a);
            fail();
        }
    }

    function assertEq(int256 a, int256 b, string memory err) internal {
        if (a != b) {
            emit log_named_string("Error", err);
            assertEq(a, b);
        }
    }

    function assertEq(uint256 a, uint256 b) internal {
        if (a != b) {
            emit log("Error: a == b not satisfied [uint]");
            emit log_named_uint("  Expected", b);
            emit log_named_uint("    Actual", a);
            fail();
        }
    }

    function assertEq(uint256 a, uint256 b, string memory err) internal {
        if (a != b) {
            emit log_named_string("Error", err);
            assertEq(a, b);
        }
    }

    function assertEq(string memory a, string memory b) internal {
        if (keccak256(abi.encodePacked(a)) != keccak256(abi.encodePacked(b))) {
            emit log("Error: a == b not satisfied [string]");
            emit log_named_string("  Expected", b);
            emit log_named_string("    Actual", a);
            fail();
        }
    }

    function assertEq(string memory a, string memory b, string memory err) internal {
        if (keccak256(abi.encodePacked(a)) != keccak256(abi.encodePacked(b))) {
            emit log_named_string("Error", err);
            assertEq(a, b);
        }
    }

    function assertEq0(bytes memory a, bytes memory b) internal {
        if (keccak256(a) != keccak256(b)) {
            emit log("Error: a == b not satisfied [bytes]");
            emit log_named_bytes("  Expected", b);
            emit log_named_bytes("    Actual", a);
            fail();
        }
    }

    function assertEq0(bytes memory a, bytes memory b, string memory err) internal {
        if (keccak256(a) != keccak256(b)) {
            emit log_named_string("Error", err);
            assertEq0(a, b);
        }
    }

    function assertGt(uint256 a, uint256 b) internal {
        if (a <= b) {
            emit log("Error: a > b not satisfied [uint]");
            emit log_named_uint("  Value a", a);
            emit log_named_uint("  Value b", b);
            fail();
        }
    }

    function assertGt(uint256 a, uint256 b, string memory err) internal {
        if (a <= b) {
            emit log_named_string("Error", err);
            assertGt(a, b);
        }
    }

    function assertGe(uint256 a, uint256 b) internal {
        if (a < b) {
            emit log("Error: a >= b not satisfied [uint]");
            emit log_named_uint("  Value a", a);
            emit log_named_uint("  Value b", b);
            fail();
        }
    }

    function assertGe(uint256 a, uint256 b, string memory err) internal {
        if (a < b) {
            emit log_named_string("Error", err);
            assertGe(a, b);
        }
    }

    function assertLt(uint256 a, uint256 b) internal {
        if (a >= b) {
            emit log("Error: a < b not satisfied [uint]");
            emit log_named_uint("  Value a", a);
            emit log_named_uint("  Value b", b);
            fail();
        }
    }

    function assertLt(uint256 a, uint256 b, string memory err) internal {
        if (a >= b) {
            emit log_named_string("Error", err);
            assertLt(a, b);
        }
    }

    function assertLe(uint256 a, uint256 b) internal {
        if (a > b) {
            emit log("Error: a <= b not satisfied [uint]");
            emit log_named_uint("  Value a", a);
            emit log_named_uint("  Value b", b);
            fail();
        }
    }

    function assertLe(uint256 a, uint256 b, string memory err) internal {
        if (a > b) {
            emit log_named_string("Error", err);
            assertLe(a, b);
        }
    }
}
