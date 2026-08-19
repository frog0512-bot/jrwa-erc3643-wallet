"use strict";
const p=require("./package.json");
if(p.dependencies["@erc3643org/erc-3643"]!=="4.1.3") throw new Error("Unexpected ERC-3643 version");
if(p.dependencies["@onchain-id/solidity"]!=="2.0.0") throw new Error("Unexpected ONCHAINID version");
console.log("JRWA v14 config OK: official ERC-3643 4.1.3, ONCHAINID 2.0.0, fixed supply 1,000,000,000 JRWA");
