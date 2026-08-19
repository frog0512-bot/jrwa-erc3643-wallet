"use strict";
require("dotenv").config({path:require("path").join(__dirname,".env")});
const fs=require("fs"),path=require("path");
const {ethers}=require("ethers");
const TREX=require("@erc3643org/erc-3643");
const OID=require("@onchain-id/solidity");

function need(n){const v=process.env[n];if(!v)throw new Error(`Missing ${n} in blockchain/.env`);return v}
function addr(v,fallback){return v&&ethers.utils.isAddress(v)?v:fallback}
function hashKey(a){return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["address"],[a]))}
async function deploy(artifact,args,signer,label){const f=new ethers.ContractFactory(artifact.abi,artifact.bytecode,signer);const c=await f.deploy(...(args||[]));console.log(`Deploying ${label}: ${c.deployTransaction.hash}`);await c.deployed();console.log(`${label} => ${c.address}`);return c}
async function wait(tx,label){const r=await tx.wait();if(!r.status)throw new Error(`${label||"tx"} reverted`);console.log(`${label||"tx"}: ${tx.hash}`);return r}

async function main(){
 const rpc=need("SEPOLIA_RPC_URL"),pk=need("DEPLOYER_PRIVATE_KEY");
 const provider=new ethers.providers.JsonRpcProvider(rpc),net=await provider.getNetwork();
 if(Number(net.chainId)!==11155111 && process.env.ALLOW_NON_SEPOLIA!=="1")throw new Error(`Expected Sepolia chainId 11155111, got ${net.chainId}`);
 const deployer=new ethers.Wallet(pk,provider);
 const relayer=new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY||pk,provider);
 const kycSigner=new ethers.Wallet(process.env.KYC_SIGNER_PRIVATE_KEY||process.env.RELAYER_PRIVATE_KEY||pk,provider);
 const suiteOwner=addr(process.env.SUITE_OWNER_ADDRESS,deployer.address);
 const controllerOwner=addr(process.env.CONTROLLER_OWNER_ADDRESS,relayer.address);
 const eth=await provider.getBalance(deployer.address); if(eth.eq(0))throw new Error("Deployer has no Sepolia ETH");
 const C=TREX.contracts;

 const ctrImpl=await deploy(C.ClaimTopicsRegistry,[],deployer,"ClaimTopicsRegistry impl");
 const tirImpl=await deploy(C.TrustedIssuersRegistry,[],deployer,"TrustedIssuersRegistry impl");
 const irsImpl=await deploy(C.IdentityRegistryStorage,[],deployer,"IdentityRegistryStorage impl");
 const irImpl=await deploy(C.IdentityRegistry,[],deployer,"IdentityRegistry impl");
 const mcImpl=await deploy(C.ModularCompliance,[],deployer,"ModularCompliance impl");
 const jrwaTokenArtifact=JSON.parse(fs.readFileSync(path.join(__dirname,"artifacts","JRWAERC3643Token.json"),"utf8"));
 const tokenImpl=await deploy(jrwaTokenArtifact,[],deployer,"JRWAERC3643Token impl");

 const oidImpl=await deploy(OID.contracts.Identity,[deployer.address,true],deployer,"ONCHAINID Identity impl");
 const oidAuthority=await deploy(OID.contracts.ImplementationAuthority,[oidImpl.address],deployer,"ONCHAINID ImplementationAuthority");
 const oidFactory=await deploy(OID.contracts.Factory,[oidAuthority.address],deployer,"ONCHAINID Factory");

 const trexAuthority=await deploy(C.TREXImplementationAuthority,[true,ethers.constants.AddressZero,ethers.constants.AddressZero],deployer,"TREXImplementationAuthority");
 const version={major:4,minor:1,patch:3};
 const impls={tokenImplementation:tokenImpl.address,ctrImplementation:ctrImpl.address,irImplementation:irImpl.address,irsImplementation:irsImpl.address,tirImplementation:tirImpl.address,mcImplementation:mcImpl.address};
 await wait(await trexAuthority.addAndUseTREXVersion(version,impls),"Activate ERC-3643 version 4.1.3");
 const trexFactory=await deploy(C.TREXFactory,[trexAuthority.address,oidFactory.address],deployer,"TREXFactory");
 await wait(await oidFactory.addTokenFactory(trexFactory.address),"Authorize TREXFactory");

 const claimIssuer=await deploy(OID.contracts.ClaimIssuer,[kycSigner.address],deployer,"JRWA KYC ClaimIssuer");
 await wait(await claimIssuer.connect(kycSigner).addKey(hashKey(kycSigner.address),3,1),"Add CLAIM signer key");

 const artifact=JSON.parse(fs.readFileSync(path.join(__dirname,"artifacts","JRWAIssuanceController.json"),"utf8"));
 const decimals=Number(process.env.JRWA_DECIMALS||8);
 if(decimals!==8) throw new Error("JRWA decimals must remain 8");
 const fixedSupply=String(process.env.JRWA_FIXED_TOTAL_SUPPLY||"1000000000");
 if(fixedSupply!=="1000000000") throw new Error("JRWA fixed total supply must remain 1,000,000,000");
 const maxSupplyBase=ethers.utils.parseUnits(fixedSupply,decimals);
 const controller=await deploy(artifact,[maxSupplyBase],deployer,"JRWAIssuanceController");

 const name=process.env.JRWA_TOKEN_NAME||"Jade Real World Asset";
 const symbol=process.env.JRWA_TOKEN_SYMBOL||"JRWA";
 const salt=process.env.JRWA_DEPLOYMENT_SALT||"JRWA-1B-V14";
 const topic=Number(process.env.JRWA_REQUIRED_KYC_CLAIM_TOPIC||1);
 const tokenDetails={owner:suiteOwner,name,symbol,decimals,irs:ethers.constants.AddressZero,ONCHAINID:ethers.constants.AddressZero,irAgents:[relayer.address],tokenAgents:[controller.address],complianceModules:[],complianceSettings:[]};
 const claimDetails={claimTopics:[topic],issuers:[claimIssuer.address],issuerClaims:[[topic]]};
 await wait(await trexFactory.deployTREXSuite(salt,tokenDetails,claimDetails),"deployTREXSuite");
 const tokenAddress=await trexFactory.getToken(salt); if(tokenAddress===ethers.constants.AddressZero)throw new Error("Factory returned zero token address");
 const token=new ethers.Contract(tokenAddress,C.Token.abi,provider);
 const irAddress=await token.identityRegistry(); const complianceAddress=await token.compliance();
 const ir=new ethers.Contract(irAddress,C.IdentityRegistry.abi,provider);
 const irsAddress=await ir.identityStorage(); const ctrAddress=await ir.topicsRegistry(); const tirAddress=await ir.issuersRegistry();

 await wait(await controller.bindToken(tokenAddress),"Bind JRWA token");
 if(await token.paused()) await wait(await controller.unpauseToken(),"Unpause JRWA");
 if(controllerOwner.toLowerCase()!==deployer.address.toLowerCase()) await wait(await controller.transferOwnership(controllerOwner),"Transfer controller ownership");

 const deployment={schema:"jrwa-official-erc3643-v14",createdAt:new Date().toISOString(),chainId:Number(net.chainId),network:"sepolia",explorer:"https://sepolia.etherscan.io",officialDependencies:{erc3643:"@erc3643org/erc-3643@4.1.3",onchainid:"@onchain-id/solidity@2.0.0"},deployer:deployer.address,relayer:relayer.address,kycSigner:kycSigner.address,suiteOwner,controllerOwner,token:{address:tokenAddress,name,symbol,decimals,fixedTotalSupply:fixedSupply},controller:controller.address,identityRegistry:irAddress,identityRegistryStorage:irsAddress,claimTopicsRegistry:ctrAddress,trustedIssuersRegistry:tirAddress,compliance:complianceAddress,claimIssuer:claimIssuer.address,requiredClaimTopic:topic,oidImplementationAuthority:oidAuthority.address,oidFactory:oidFactory.address,trexImplementationAuthority:trexAuthority.address,trexFactory:trexFactory.address,intrinsicHardCap:true};
 const dir=path.join(__dirname,"deployments");fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"sepolia.json"),JSON.stringify(deployment,null,2));
 console.log(JSON.stringify(deployment,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
