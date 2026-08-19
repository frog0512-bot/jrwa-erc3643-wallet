"use strict";
const pkg=require("./package.json");
const TREX=require("@erc3643org/erc-3643");
const OID=require("@onchain-id/solidity");
const requiredTrex=["Token","TREXFactory","TREXImplementationAuthority","IdentityRegistry","IdentityRegistryStorage","ClaimTopicsRegistry","TrustedIssuersRegistry","ModularCompliance"];
const requiredOid=["Identity","IdentityProxy","ImplementationAuthority","Factory","ClaimIssuer"];
const missing=[...requiredTrex.filter(k=>!TREX.contracts[k]).map(k=>"TREX."+k),...requiredOid.filter(k=>!OID.contracts[k]).map(k=>"OID."+k)];
if(missing.length) throw new Error("Missing official artifacts: "+missing.join(", "));
console.log(JSON.stringify({ok:true,erc3643Package:pkg.dependencies["@erc3643org/erc-3643"],onchainIdPackage:pkg.dependencies["@onchain-id/solidity"],trexArtifacts:requiredTrex,oidArtifacts:requiredOid},null,2));
