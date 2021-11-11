const { ethers } = require("hardhat");

async function waitForBlocks(blocks) {
    const _blockNumber = await ethers.provider.getBlockNumber();
    await new Promise((resolve, reject) => {
        ethers.provider.on('block', (blockNumber) => {
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

    // Large number for approval
    const largeApproval = '100000000000000000000000000000000';
    // USDT address
    const usdtAddress = '0xD16bAbe52980554520F6Da505dF4d1b124c815a7';
    // Ethereum 0 address, used when toggling changes in treasury
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    // USDT bond BCV
    const usdtBondBCV = '30';
    // Bond vesting length in blocks.
    const bondVestingLength = '10000';
    // Min bond price
    const minBondPrice = '5000';
    // Max bond payout
    const maxBondPayout = '50'
    // DAO fee for bond
    const bondFee = '1000';
    // Max debt bond can take on
    const maxBondDebt = '1000000000000000';
    // Initial Bond debt
    const intialBondDebt = '0'

    const OHM = await ethers.getContractAt('OlympusERC20Token', '0x712968FF3F3Af287719Abc4a511C1a5a7b6d391c');
    const Treasury = await ethers.getContractAt('OlympusTreasury', '0x1381192ae3a3475618a9d93e8757b76B30D696f8');
    const Staking = await ethers.getContractAt('OlympusStaking', '0x3A2A7823d6e696Ed3113f9F1fFaffD459Db4f0b9');
    const StakingHelper = await ethers.getContractAt('StakingHelper', '0xBE7e24581d384f1539Edc1B175B1B98751f8EC0A');
    const USDT = await ethers.getContractAt('HOORC20Template', usdtAddress);

    // Deploy bonding calc
    console.log('Deploying OlympusBondingCalculator');
    const OlympusBondingCalculator = await ethers.getContractFactory('OlympusBondingCalculator');
    const olympusBondingCalculator = await OlympusBondingCalculator.deploy(OHM.address);

    // Deploy USDT bond
    // constructor( address _OHM, address _principle, address _treasury, address _DAO, address _bondCalculator)
    // if not LP bond, bondCalculator should be address(0)
    console.log('Deploying USDT Bond');
    const USDTBond = await ethers.getContractFactory('OlympusBondDepository');
    const usdtBond = await USDTBond.deploy(OHM.address, usdtAddress, Treasury.address, deployer.address, zeroAddress);

    // queue and toggle USDT reserve token
    console.log('Queueing USDT reserve token');
    await Treasury.queue('2', USDT.address);
    await waitForBlocks(20);
    console.log('Toggling USDT reserve token');
    await Treasury.toggle('2', USDT.address, zeroAddress); // MANAGING.RESERVEDEPOSITOR

    // queue and toggle USDT bond reserve depositor
    console.log('Queueing USDT bond reserve depositor');
    await Treasury.queue('0', usdtBond.address);
    await waitForBlocks(20);
    console.log('Toggling USDT bond reserve depositor');
    await Treasury.toggle('0', usdtBond.address, zeroAddress); // MANAGING.RESERVEDEPOSITOR

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

    // Approve the treasury to spend USDT
    console.log('Approving treasury to spend USDT');
    await USDT.approve(Treasury.address, largeApproval);
    // Approve USDT bonds to spend deployer's USDT
    console.log('Approving USDT bonds to spend deployer\'s USDT');
    await USDT.approve(usdtBond.address, largeApproval);

    // Approve staking and staking helper contact to spend deployer's OHM
    console.log('Approving staking contract to spend OHM');
    await OHM.approve(Staking.address, largeApproval);
    console.log('Approving staking helper contract to spend OHM');
    await OHM.approve(StakingHelper.address, largeApproval);

    // Deposit 0.06 USDT (0.06 * 10 ** 6) to treasury
    // 0.02 OHM gets minted to deployer
    // 0.04 (0.04 * 10 ** 9) are in treasury as excesss reserves
    console.log('Depositing 0.06 USDT to treasury');
    await Treasury.deposit('60000', USDT.address, '40000000');

    // Bond 0.02 (0.02 * 10 ** 6) USDT in each of their bonds
    console.log('Bonding 0.02 USDT in each of their bonds');
    await usdtBond.deposit('20000', '50000', deployer.address);

    // Stake OHM through helper
    console.log('Staking OHM through helper');
    await StakingHelper.stake('20000000');

    console.log("OlympusBondingCalculator:  ", olympusBondingCalculator.address);
    console.log("USDT Bond:                 ", usdtBond.address);
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
});
