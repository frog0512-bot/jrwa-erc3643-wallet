# JRWA ERC-3643 Wallet — Codex / Deployment Repository

Production-candidate JRWA member wallet and administrator service built on the official ERC-3643/T-REX open-source contracts and ONCHAINID.

## Core parameters
- Token: Jade Real World Asset (`JRWA`)
- Fixed total supply: **1,000,000,000 JRWA**
- Decimals: **8**
- Default chain target: **Ethereum Sepolia**
- Default runtime: central server ledger for integration testing; optional ERC-3643 on-chain mode after Sepolia deployment

## Security model
JRWA is not implemented as an unrestricted ERC-20. On-chain transfers use ERC-3643 identity and compliance checks. The JRWA token subclass adds an intrinsic 1B hard cap, and the issuance controller applies a second mint ceiling.

No production secrets are stored in this repository. On first server start, `JRWA_ADMIN_PASSWORD` is required.

## Quick local server
```bash
cp .env.example .env
# edit .env and set a strong JRWA_ADMIN_PASSWORD
docker compose up --build
```
Then open `http://localhost:8080` and check `http://localhost:8080/api/health`.

## Blockchain compile
```bash
cd blockchain
cp .env.example .env
npm install
npm run verify:official
npm run compile
npm run smoke
```

## Sepolia deployment
Fill testnet-only secrets in `blockchain/.env`, then:
```bash
npm run deploy:sepolia
npm run status
```
Or use the GitHub Actions manual workflow `Deploy JRWA to Sepolia` after configuring repository secrets.

## Codex
This repository contains `AGENTS.md`. Connect this repository to a Codex environment and ask Codex to run the validation suite before changing deployment or token controls.

## Important
This repository is a technical implementation candidate. A production security-token/RWA launch still requires jurisdiction-specific legal review, independent smart-contract/security audit, operational key custody, KYC/AML integration, infrastructure hardening, monitoring, backup/recovery, and a controlled production deployment process.
