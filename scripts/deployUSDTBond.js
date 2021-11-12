const { ethers } = require("hardhat");

async function waitForBlocks(blocks) {
    console.log("Waiting for " + blocks + " blocks");
    const _blockNumber = await ethers.provider.getBlockNumber();
    await new Promise((resolve) => {
        ethers.provider.on('block', (blockNumber) => {
            console.log("Block: " + blockNumber);
            if (blockNumber == _blockNumber + blocks) {
                ethers.provider.removeAllListeners('block');
                resolve();
            }
        });
    });
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Deploying contracts with the account:', deployer.address);
    const balance = await deployer.getBalance();
    console.log('Account balance:', balance.toString());

    // Large number for approval
    const largeApproval = '100000000000000000000000000000000';
    // Ethereum 0 address, used when toggling changes in treasury
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    // USDT bond BCV
    const usdtBondBCV = '30';
    // Bond vesting length in blocks.
    const bondVestingLength = '10000';
    // Min bond price
    const minBondPrice = '0';
    // Max bond payout
    const maxBondPayout = '1000'
    // DAO fee for bond
    const bondFee = '1000';
    // Max debt bond can take on
    const maxBondDebt = '50000000000000000000000';
    // Initial Bond debt
    const intialBondDebt = '0'

    const OHM = await ethers.getContractAt('OlympusERC20Token', '0x712968FF3F3Af287719Abc4a511C1a5a7b6d391c');
    const Treasury = await ethers.getContractAt('OlympusTreasury', '0x1381192ae3a3475618a9d93e8757b76B30D696f8');
    const StakingHelper = await ethers.getContractAt('StakingHelper', '0xBE7e24581d384f1539Edc1B175B1B98751f8EC0A');
    const RedeemHelper = await ethers.getContractAt('RedeemHelper', '0x6F62a16ebf69BEe0Cb12D89Bfa30940EfdDCD5a3');
    const USDT = await ethers.getContractAt('HOORC20Template', '0xD16bAbe52980554520F6Da505dF4d1b124c815a7');

    // Deploy USDT bond
    // constructor( address _OHM, address _principle, address _treasury, address _DAO, address _bondCalculator)
    // if not LP bond, bondCalculator should be address(0)
    console.log('Deploying USDT Bond');
    const USDTBond = await ethers.getContractFactory('OlympusBondDepository');
    const usdtBond = await USDTBond.deploy(OHM.address, USDT.address, Treasury.address, deployer.address, zeroAddress);

    // Set USDT bond terms
    /* function initializeBondTerms(
        uint256 _controlVariable, // scaling variable for price // 2274
        uint256 _vestingTerm, // in blocks // require(_vestingTerm >= 10000, "Vesting must be longer than 36 hours")
        uint256 _minimumPrice, // vs principle value // 0
        uint256 _maxPayout, // in thousandths of a %. i.e. 500 = 0.5% // require(_maxPayout <= 1000, "Payout cannot be above 1 percent")
        uint256 _fee, // as % of bond payout, in hundreths. ( 500 = 5% = 0.05 for every 1 paid) // require(_fee <= 10000, "DAO fee cannot exceed payout")
        uint256 _maxDebt, // 9 decimal debt ratio, max % total supply created as debt // 1000000000000000000000000
        uint256 _initialDebt // total value of outstanding bonds; used for pricing // 0?
    ) */
    console.log('Setting USDT bond terms');
    await usdtBond.initializeBondTerms(usdtBondBCV, bondVestingLength, minBondPrice, maxBondPayout, bondFee, maxBondDebt, intialBondDebt);
    // Set staking for USDT bond
    // function setStaking(address _staking, bool _helper)
    // _helper = true is stakingHelper
    // _helper = false is staking
    console.log('Setting staking for USDT bond');
    await usdtBond.setStaking(StakingHelper.address, true);

    // queue and toggle USDT reserve token
    console.log('Queueing USDT reserve token');
    await Treasury.queue('2', USDT.address);
    await waitForBlocks(10);
    console.log('Toggling USDT reserve token');
    await Treasury.toggle('2', USDT.address, zeroAddress); // MANAGING.RESERVETOKEN

    // queue and toggle USDT bond reserve depositor
    console.log('Queueing USDT bond reserve depositor');
    await Treasury.queue('0', usdtBond.address);
    await waitForBlocks(10);
    console.log('Toggling USDT bond reserve depositor');
    await Treasury.toggle('0', usdtBond.address, zeroAddress); // MANAGING.RESERVEDEPOSITOR

    // add USDT bond to redeem helper
    console.log('Add USDT bond to redeem helper');
    await RedeemHelper.addBondContract(usdtBond.address);

    // Approve the treasury to spend USDT
    console.log('Approving treasury to spend USDT');
    await USDT.approve(Treasury.address, largeApproval);
    // Approve USDT bonds to spend deployer's USDT
    console.log('Approving USDT bonds to spend deployer\'s USDT');
    await USDT.approve(usdtBond.address, largeApproval);

    console.log("USDT Bond:                 ", usdtBond.address);
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
});
