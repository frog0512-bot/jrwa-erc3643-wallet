# AGENTS.md — JRWA ERC-3643 Wallet

## Mission
Maintain and deploy the JRWA member wallet using the official ERC-3643/T-REX open-source packages and ONCHAINID. Do not replace ERC-3643 with unrestricted ERC-20 logic.

## Invariants
1. `JRWA` fixed total supply is exactly **1,000,000,000 JRWA**.
2. Token decimals are **8**.
3. The intrinsic token `_mint()` hard cap and the issuance-controller cap must both remain enforced.
4. A recipient must pass ERC-3643 Identity Registry verification and Compliance before an on-chain transfer.
5. No real private keys, passwords, RPC credentials, seed phrases, or KYC PII may be committed.
6. `.env` files are local/secret; only `.env.example` may be committed.
7. Mainnet deployment is prohibited unless explicitly authorized after audit/legal sign-off. Default target is Sepolia.
8. Never claim compile/deploy success when dependencies or secrets are unavailable.

## Required checks
```bash
python3 -m py_compile server.py
python3 tests/verify_package.py
cd blockchain
npm install
npm run verify:official
npm run compile
npm run smoke
```

## Deployment rules
Runtime secrets: `JRWA_ADMIN_PASSWORD`, `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `RELAYER_PRIVATE_KEY`, `KYC_SIGNER_PRIVATE_KEY`, `WALLET_MASTER_KEY`.
Deployment addresses belong in `blockchain/deployments/`; private keys never do.
After Sepolia deployment, record chain ID, token address, Identity Registry, Compliance, Controller, total/max supply and deployment transaction hashes.

## Review focus
Prioritize supply-cap bypasses, identity/compliance bypasses, private-key exposure, authorization failures, CSRF/session issues, replay/idempotency bugs and reconciliation errors.
