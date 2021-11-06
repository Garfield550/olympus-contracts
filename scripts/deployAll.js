// @dev. This script will deploy this V1.1 of Olympus. It will deploy the whole ecosystem except for the LP tokens and their bonds. 
// This should be enough of a test environment to learn about and test implementations with the Olympus as of V1.1.
// Not that the every instance of the Treasury's function 'valueOf' has been changed to 'valueOfToken'... 
// This solidity function was conflicting w js object property name

const { ethers } = require("hardhat");

async function main() {

    const [deployer, MockDAO] = await ethers.getSigners();
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

    // Large number for approval for Frax and DAI
    const largeApproval = '100000000000000000000000000000000';

    // Initial mint for Frax and DAI (10,000,000)
    const initialMint = '10000000000000000000000000';

    // DAI bond BCV
    const daiBondBCV = '369';

    // Frax bond BCV
    const fraxBondBCV = '690';

    // Bond vesting length in blocks. 33110 ~ 5 days
    const bondVestingLength = '33110';

    // Min bond price
    const minBondPrice = '50000';

    // Max bond payout
    const maxBondPayout = '50'

    // DAO fee for bond
    const bondFee = '10000';

    // Max debt bond can take on
    const maxBondDebt = '1000000000000000';

    // Initial Bond debt
    const intialBondDebt = '0'

    // Deploy OHM
    const OHM = await ethers.getContractFactory('OlympusERC20Token');
    const ohm = await OHM.deploy();

    // Deploy DAI
    // const DAI = await ethers.getContractFactory('DAI');
    // const dai = await DAI.deploy( 0 );

    // Deploy Frax
    // const Frax = await ethers.getContractFactory('FRAX');
    // const frax = await Frax.deploy( 0 );

    // Deploy 10,000,000 mock DAI and mock Frax
    // await dai.mint( deployer.address, initialMint );
    // await frax.mint( deployer.address, initialMint );

    // Deploy treasury
    const Treasury = await ethers.getContractFactory('OlympusTreasury'); 
    const treasury = await Treasury.deploy( ohm.address, 0 );

    // Deploy bonding calc
    const OlympusBondingCalculator = await ethers.getContractFactory('OlympusBondingCalculator');
    const olympusBondingCalculator = await OlympusBondingCalculator.deploy( ohm.address );

    // Deploy staking distributor
    const Distributor = await ethers.getContractFactory('Distributor');
    const distributor = await Distributor.deploy(treasury.address, ohm.address, epochLengthInBlocks, firstEpochBlock);

    // Deploy sOHM
    const SOHM = await ethers.getContractFactory('sOlympus');
    const sOHM = await SOHM.deploy();

    // Deploy Staking
    const Staking = await ethers.getContractFactory('OlympusStaking');
    const staking = await Staking.deploy( ohm.address, sOHM.address, epochLengthInBlocks, firstEpochNumber, firstEpochBlock );

    // Deploy staking warmpup
    const StakingWarmpup = await ethers.getContractFactory('StakingWarmup');
    const stakingWarmup = await StakingWarmpup.deploy(staking.address, sOHM.address);

    // Deploy staking helper
    // StakingHelper: 0xa55cE3E25bD4cb6C5375AA393335b708dB790915
    const StakingHelper = await ethers.getContractFactory('StakingHelper');
    const stakingHelper = await StakingHelper.deploy(staking.address, ohm.address);

    // Deploy DAI bond
    // constructor( address _OHM, address _principle, address _treasury, address _DAO, address _bondCalculator)
    // if not LP bond, bondCalculator should be address(0)
    const DAIBond = await ethers.getContractFactory('OlympusBondDepository');
    const daiBond = await DAIBond.deploy(ohm.address, dai.address, treasury.address, MockDAO.address, zeroAddress);

    // Deploy Frax bond
    // constructor( address _OHM, address _principle, address _treasury, address _DAO, address _bondCalculator)
    // if not LP bond, bondCalculator should be address(0)
    const FraxBond = await ethers.getContractFactory('OlympusBondDepository');
    const fraxBond = await FraxBond.deploy(ohm.address, frax.address, treasury.address, MockDAO.address, zeroAddress);

    // queue and toggle DAI and Frax bond reserve depositor
    await treasury.queue('0', daiBond.address);
    await treasury.queue('0', fraxBond.address);
    // function toggle(MANAGING _managing, address _address, address _calculator)
    // if not LP bond, bondCalculator should be address(0)
    await treasury.toggle('0', daiBond.address, zeroAddress); // MANAGING.RESERVEDEPOSITOR
    await treasury.toggle('0', fraxBond.address, zeroAddress); // MANAGING.RESERVEDEPOSITOR

    // Set DAI and Frax bond terms
    /* function initializeBondTerms(
        uint256 _controlVariable, // scaling variable for price // 2274
        uint256 _vestingTerm, // in blocks // require(_vestingTerm >= 10000, "Vesting must be longer than 36 hours")
        uint256 _minimumPrice, // vs principle value // 0
        uint256 _maxPayout, // in thousandths of a %. i.e. 500 = 0.5% // require(_maxPayout <= 1000, "Payout cannot be above 1 percent")
        uint256 _fee, // as % of bond payout, in hundreths. ( 500 = 5% = 0.05 for every 1 paid) // require(_fee <= 10000, "DAO fee cannot exceed payout")
        uint256 _maxDebt, // 9 decimal debt ratio, max % total supply created as debt // 1000000000000000000000000
        uint256 _initialDebt // total value of outstanding bonds; used for pricing // 0?
    ) */
    await daiBond.initializeBondTerms(daiBondBCV, bondVestingLength, minBondPrice, maxBondPayout, bondFee, maxBondDebt, intialBondDebt);
    await fraxBond.initializeBondTerms(fraxBondBCV, bondVestingLength, minBondPrice, maxBondPayout, bondFee, maxBondDebt, intialBondDebt);

    // Set staking for DAI and Frax bond
    // function setStaking(address _staking, bool _helper)
    // _helper = true is stakingHelper
    // _helper = false is staking
    // OlympusDAO: DAI Bond V3: 0x575409F8d77c12B05feD8B455815f0e54797381c : stakingHelper
    // OlympusDAO: OHM/DAI LP Bond V4: 0x956c43998316b6a2F21f89a1539f73fB5B78c151 : stakingHelper
    // OlympusDAO: FRAX Bond V1: 0x8510c8c2B6891E04864fa196693D44E6B6ec2514 : stakingHelper
    // OlympusDAO: OHM/FRAX LP Bond V2: 0xc20CffF07076858a7e642E396180EC390E5A02f7 : stakingHelper
    await daiBond.setStaking(stakingHelper.address, true);
    await fraxBond.setStaking(staking.address, false);

    // Initialize sOHM and set the index
    await sOHM.initialize(staking.address);
    await sOHM.setIndex(initialIndex);

    // set distributor contract and warmup contract
    await staking.setContract('0', distributor.address); // CONTRACTS.DISTRIBUTOR
    await staking.setContract('1', stakingWarmup.address); // CONTRACTS.WARMUP

    // Set treasury for OHM token
    await ohm.setVault(treasury.address);

    // Add staking contract as distributor recipient
    await distributor.addRecipient(staking.address, initialRewardRate);

    // queue and toggle reward manager
    await treasury.queue('8', distributor.address);
    await treasury.toggle('8', distributor.address, zeroAddress); // MANAGING.REWARDMANAGER

    // queue and toggle deployer reserve depositor
    await treasury.queue('0', deployer.address);
    await treasury.toggle('0', deployer.address, zeroAddress);

    // queue and toggle liquidity depositor
    await treasury.queue('4', deployer.address, );
    await treasury.toggle('4', deployer.address, zeroAddress); // MANAGING.LIQUIDITYDEPOSITOR

    // Approve the treasury to spend DAI and Frax
    await dai.approve(treasury.address, largeApproval );
    await frax.approve(treasury.address, largeApproval );

    // Approve dai and frax bonds to spend deployer's DAI and Frax
    await dai.approve(daiBond.address, largeApproval );
    await frax.approve(fraxBond.address, largeApproval );

    // Approve staking and staking helper contact to spend deployer's OHM
    await ohm.approve(staking.address, largeApproval);
    await ohm.approve(stakingHelper.address, largeApproval);

    // Deposit 9,000,000 DAI to treasury, 600,000 OHM gets minted to deployer and 8,400,000 are in treasury as excesss reserves
    await treasury.deposit('9000000000000000000000000', dai.address, '8400000000000000');

    // Deposit 5,000,000 Frax to treasury, all is profit and goes as excess reserves
    await treasury.deposit('5000000000000000000000000', frax.address, '5000000000000000');

    // Stake OHM through helper
    // await stakingHelper.stake('100000000000');

    // Bond 1,000 OHM and Frax in each of their bonds
    await daiBond.deposit('1000000000000000000000', '60000', deployer.address );
    await fraxBond.deposit('1000000000000000000000', '60000', deployer.address );

    console.log( "OHM: " + ohm.address );
    console.log( "DAI: " + dai.address );
    console.log( "Frax: " + frax.address );
    console.log( "Treasury: " + treasury.address );
    console.log( "Calc: " + olympusBondingCalculator.address );
    console.log( "Staking: " + staking.address );
    console.log( "sOHM: " + sOHM.address );
    console.log( "Distributor " + distributor.address );
    console.log( "Staking Wawrmup " + stakingWarmup.address );
    console.log( "Staking Helper " + stakingHelper.address );
    console.log( "DAI Bond: " + daiBond.address );
    console.log( "Frax Bond: " + fraxBond.address );
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})