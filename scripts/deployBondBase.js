const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Deploying contracts with the account:', deployer.address);
    const balance = await deployer.getBalance();
    console.log('Account balance:', balance.toString());

    const OHM = await ethers.getContractAt('OlympusERC20Token', '0x712968FF3F3Af287719Abc4a511C1a5a7b6d391c');

    // Deploy bonding calc
    console.log('Deploying OlympusBondingCalculator');
    const OlympusBondingCalculator = await ethers.getContractFactory('OlympusBondingCalculator');
    const olympusBondingCalculator = await OlympusBondingCalculator.deploy(OHM.address);

    // Deploy redeem helper
    console.log('Deploying RedeemHelper');
    const RedeemHelper = await ethers.getContractFactory('RedeemHelper');
    const redeemHelper = await RedeemHelper.deploy();

    console.log("OlympusBondingCalculator:  ", olympusBondingCalculator.address);
    console.log("RedeemHelper:              ", redeemHelper.address);
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
});
