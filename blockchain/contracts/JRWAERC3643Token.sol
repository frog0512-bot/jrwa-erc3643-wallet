// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import "@erc3643org/erc-3643/contracts/token/Token.sol";

/// @title JRWA ERC-3643 Token — 1B Intrinsic Hard Cap
/// @notice Official ERC-3643 Token v4.1.3 subclass with an immutable-by-code mint ceiling.
contract JRWAERC3643Token is Token {
    uint8 public constant JRWA_DECIMALS = 8;
    uint256 public constant MAX_TOTAL_SUPPLY_BASE = 1_000_000_000 * 10**8;

    function _mint(address _userAddress, uint256 _amount) internal virtual override {
        require(
            _totalSupply + _amount <= MAX_TOTAL_SUPPLY_BASE,
            "JRWA: fixed total supply 1B exceeded"
        );
        super._mint(_userAddress, _amount);
    }
}
