"use strict";
const fs=require("fs"), path=require("path"), solc=require("solc");
const ROOT=__dirname;
function findImports(importPath){
  const candidates=[path.join(ROOT,"node_modules",importPath),path.join(ROOT,importPath),path.join(ROOT,"contracts",importPath)];
  for(const p of candidates){if(fs.existsSync(p)) return {contents:fs.readFileSync(p,"utf8")};}
  return {error:`Import not found: ${importPath}`};
}
const files=["JRWAIssuanceController.sol","JRWAERC3643Token.sol"];
const sources={};
for(const f of files) sources[f]={content:fs.readFileSync(path.join(ROOT,"contracts",f),"utf8")};
const input={language:"Solidity",sources,settings:{optimizer:{enabled:true,runs:200},outputSelection:{"*":{"*":["abi","evm.bytecode.object","evm.deployedBytecode.object","storageLayout"]}}}};
const out=JSON.parse(solc.compile(JSON.stringify(input),{import:findImports}));
const errs=(out.errors||[]).filter(x=>x.severity==="error");
if(errs.length){console.error(errs.map(x=>x.formattedMessage).join("\n"));process.exit(1)}
const artifactsDir=path.join(ROOT,"artifacts");fs.mkdirSync(artifactsDir,{recursive:true});
for(const [sourceName,contracts] of Object.entries(out.contracts)) for(const [name,c] of Object.entries(contracts)) {
  if(!files.includes(sourceName) || !["JRWAIssuanceController","JRWAERC3643Token"].includes(name)) continue;
  fs.writeFileSync(path.join(artifactsDir,`${name}.json`),JSON.stringify({contractName:name,sourceName,abi:c.abi,bytecode:"0x"+c.evm.bytecode.object,deployedBytecode:"0x"+c.evm.deployedBytecode.object,storageLayout:c.storageLayout},null,2));
  console.log(`Compiled ${name} using solc ${solc.version()}`);
}
