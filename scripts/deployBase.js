const { ethers } = require("hardhat");

async function waitForBlocks(blocks) {
    const _blockNumber = await ethers.provider.getBlockNumber();
    await new Promise((resolve, reject) => {
        ethers.provider.on('block', (blockNumber) => {
            console.log('Block:', blockNumber.toString());
            if (blockNumber == _blockNumber + blocks) {
                resolve();
            }
        });
        ethers.provider.on('error', (error) => {
            reject(error);
        });
    });
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Deploying contracts with the account:', deployer.address);
    const balance = await deployer.getBalance();
    console.log('Account balance:', balance.toString());

    // Initial staking index
    const initialIndex = '1160';
    // First block epoch occurs
    const firstEpochBlock = '5571160';
    // What epoch will be first epoch
    const firstEpochNumber = '338';
    // How many blocks are in each epoch
    const epochLengthInBlocks = '400';
    // Initial reward rate for epoch
    const initialRewardRate = '3000';
    // Ethereum 0 address, used when toggling changes in treasury
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    // Deploy OHM
    console.log('Deploying OlympusERC20Token');
    const OHM = await ethers.getContractFactory('OlympusERC20Token');
    const ohm = await OHM.deploy();

    // Deploy treasury
    // constructor(address _OHM, uint256 _blocksNeededForQueue)
    console.log('Deploying OlympusTreasury');
    const Treasury = await ethers.getContractFactory('OlympusTreasury'); 
    const treasury = await Treasury.deploy(ohm.address, 10);

    // Deploy staking distributor
    console.log('Deploying Distributor');
    const Distributor = await ethers.getContractFactory('Distributor');
    const distributor = await Distributor.deploy(treasury.address, ohm.address, epochLengthInBlocks, firstEpochBlock);

    // Deploy sOHM
    console.log('Deploying sOlympus');
    const SOHM = await ethers.getContractFactory('sOlympus');
    const sOHM = await SOHM.deploy();

    // Deploy Staking
    console.log('Deploying OlympusStaking');
    const Staking = await ethers.getContractFactory('OlympusStaking');
    const staking = await Staking.deploy(ohm.address, sOHM.address, epochLengthInBlocks, firstEpochNumber, firstEpochBlock);

    // Deploy staking helper
    // StakingHelper: 0xa55cE3E25bD4cb6C5375AA393335b708dB790915
    console.log('Deploying StakingHelper');
    const StakingHelper = await ethers.getContractFactory('StakingHelper');
    const stakingHelper = await StakingHelper.deploy(staking.address, ohm.address);

    // Deploy staking warmpup
    console.log('Deploying StakingWarmup');
    const StakingWarmpup = await ethers.getContractFactory('StakingWarmup');
    const stakingWarmup = await StakingWarmpup.deploy(staking.address, sOHM.address);

    // Set treasury for OHM token
    console.log('Setting treasury for OHM token');
    await ohm.setVault(treasury.address);
    // queue and toggle deployer reserve depositor
    console.log('Queueing reserve depositor');
    await treasury.queue('0', deployer.address);
    await waitForBlocks(20);
    console.log('Toggling reserve depositor');
    await treasury.toggle('0', deployer.address, zeroAddress);
    // queue and toggle liquidity depositor
    console.log('Queueing liquidity depositor');
    await treasury.queue('4', deployer.address, );
    await waitForBlocks(20);
    console.log('Toggling liquidity depositor');
    await treasury.toggle('4', deployer.address, zeroAddress); // MANAGING.LIQUIDITYDEPOSITOR
    // queue and toggle reward manager
    console.log('Queueing reward manager');
    await treasury.queue('8', distributor.address);
    await waitForBlocks(20);
    console.log('Toggling reward manager');
    await treasury.toggle('8', distributor.address, zeroAddress); // MANAGING.REWARDMANAGER
    // Add staking contract as distributor recipient
    console.log('Adding staking contract as distributor recipient');
    await distributor.addRecipient(staking.address, initialRewardRate);
    // Initialize sOHM and set the index
    console.log('Initializing sOlympus');
    await sOHM.initialize(staking.address);
    console.log('Setting initial index');
    await sOHM.setIndex(initialIndex);
    // set distributor contract and warmup contract
    console.log('Setting staking distributor contract');
    await staking.setContract('0', distributor.address); // CONTRACTS.DISTRIBUTOR
    console.log('Setting staking warmup contract');
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
