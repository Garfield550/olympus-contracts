const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Deploying contracts with the account: ' + deployer.address);

    // Initial staking index
    const initialIndex = '7675210820';
    // First block epoch occurs
    const firstEpochBlock = '8961000';
    // What epoch will be first epoch
    const firstEpochNumber = '338';
    // How many blocks are in each epoch
    const epochLengthInBlocks = '2200';
    // Initial reward rate for epoch
    const initialRewardRate = '3000';
    // Ethereum 0 address, used when toggling changes in treasury
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    // Deploy OHM
    const OHM = await ethers.getContractFactory('OlympusERC20Token');
    const ohm = await OHM.deploy();

    // Deploy treasury
    // constructor(address _OHM, uint256 _blocksNeededForQueue)
    const Treasury = await ethers.getContractFactory('OlympusTreasury'); 
    const treasury = await Treasury.deploy(ohm.address, 10);

    // Deploy staking distributor
    const Distributor = await ethers.getContractFactory('Distributor');
    const distributor = await Distributor.deploy(treasury.address, ohm.address, epochLengthInBlocks, firstEpochBlock);

    // Deploy sOHM
    const SOHM = await ethers.getContractFactory('sOlympus');
    const sOHM = await SOHM.deploy();

    // Deploy Staking
    const Staking = await ethers.getContractFactory('OlympusStaking');
    const staking = await Staking.deploy(ohm.address, sOHM.address, epochLengthInBlocks, firstEpochNumber, firstEpochBlock);

    // Deploy staking helper
    // StakingHelper: 0xa55cE3E25bD4cb6C5375AA393335b708dB790915
    const StakingHelper = await ethers.getContractFactory('StakingHelper');
    const stakingHelper = await StakingHelper.deploy(staking.address, ohm.address);

    // Deploy staking warmpup
    const StakingWarmpup = await ethers.getContractFactory('StakingWarmup');
    const stakingWarmup = await StakingWarmpup.deploy(staking.address, sOHM.address);

    // Set treasury for OHM token
    await ohm.setVault(treasury.address);
    // queue and toggle deployer reserve depositor
    await treasury.queue('0', deployer.address);
    await treasury.toggle('0', deployer.address, zeroAddress);
    // queue and toggle liquidity depositor
    await treasury.queue('4', deployer.address, );
    await treasury.toggle('4', deployer.address, zeroAddress); // MANAGING.LIQUIDITYDEPOSITOR
    // queue and toggle reward manager
    await treasury.queue('8', distributor.address);
    await treasury.toggle('8', distributor.address, zeroAddress); // MANAGING.REWARDMANAGER
    // Add staking contract as distributor recipient
    await distributor.addRecipient(staking.address, initialRewardRate);
    // Initialize sOHM and set the index
    await sOHM.initialize(staking.address);
    await sOHM.setIndex(initialIndex);
    // set distributor contract and warmup contract
    await staking.setContract('0', distributor.address); // CONTRACTS.DISTRIBUTOR
    await staking.setContract('1', stakingWarmup.address); // CONTRACTS.WARMUP

    console.log("OlympusERC20Token:     " + ohm.address);
    console.log("OlympusTreasury:       " + treasury.address);
    console.log("Distributor:           " + distributor.address);
    console.log("sOlympus:              " + sOHM.address);
    console.log("OlympusStaking:        " + staking.address);
    console.log("StakingHelper:         " + stakingHelper.address);
    console.log("StakingWarmup:         " + stakingWarmup.address);
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
});
