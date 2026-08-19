// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

interface IJRWAERC3643Token {
    function totalSupply() external view returns (uint256);
    function mint(address to, uint256 amount) external;
    function burn(address user, uint256 amount) external;
    function freezePartialTokens(address user, uint256 amount) external;
    function unfreezePartialTokens(address user, uint256 amount) external;
    function setAddressFrozen(address user, bool frozen) external;
    function pause() external;
    function unpause() external;
    function recoveryAddress(address lostWallet, address newWallet, address investorOnchainID) external returns (bool);
}

contract JRWAIssuanceController {
    address public owner;
    IJRWAERC3643Token public token;
    uint256 public immutable maxSupply;
    bool public tokenBound;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TokenBound(address indexed token);
    event ControlledMint(address indexed to, uint256 amount, uint256 totalSupplyAfter);
    event ControlledBurn(address indexed from, uint256 amount, uint256 totalSupplyAfter);

    modifier onlyOwner() { require(msg.sender == owner, "JRWA: not controller owner"); _; }

    constructor(uint256 maxSupply_) {
        require(maxSupply_ > 0, "JRWA: zero max supply");
        owner = msg.sender;
        maxSupply = maxSupply_;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function bindToken(address token_) external onlyOwner {
        require(!tokenBound, "JRWA: token already bound");
        require(token_ != address(0), "JRWA: zero token");
        token = IJRWAERC3643Token(token_);
        tokenBound = true;
        emit TokenBound(token_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "JRWA: zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function remainingMintable() external view returns (uint256) {
        if (!tokenBound) return maxSupply;
        uint256 supply = token.totalSupply();
        return supply >= maxSupply ? 0 : maxSupply - supply;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(tokenBound, "JRWA: token not bound");
        require(amount > 0, "JRWA: zero amount");
        require(token.totalSupply() + amount <= maxSupply, "JRWA: 1B fixed total supply exceeded");
        token.mint(to, amount);
        emit ControlledMint(to, amount, token.totalSupply());
    }

    function burn(address from, uint256 amount) external onlyOwner {
        require(tokenBound, "JRWA: token not bound");
        require(amount > 0, "JRWA: zero amount");
        token.burn(from, amount);
        emit ControlledBurn(from, amount, token.totalSupply());
    }

    function freezePartial(address user, uint256 amount) external onlyOwner { token.freezePartialTokens(user, amount); }
    function unfreezePartial(address user, uint256 amount) external onlyOwner { token.unfreezePartialTokens(user, amount); }
    function setWalletFrozen(address user, bool frozen) external onlyOwner { token.setAddressFrozen(user, frozen); }
    function pauseToken() external onlyOwner { token.pause(); }
    function unpauseToken() external onlyOwner { token.unpause(); }
    function recoverWallet(address lostWallet, address newWallet, address investorOnchainID) external onlyOwner returns (bool) {
        return token.recoveryAddress(lostWallet, newWallet, investorOnchainID);
    }
}
