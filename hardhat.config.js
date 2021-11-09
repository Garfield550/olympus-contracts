require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.7.5",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    bsc_mainnet: {
      chainId: 56,
      url: 'https://bsc-dataseed.binance.org/',
      timeout: 1000 * 60,
      accounts: [process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000'],
    },
    bsc_testnet: {
      chainId: 97,
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      timeout: 1000 * 60,
      accounts: [process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000'],
    },
    hoo_mainnet: {
      chainId: 70,
      url: 'https://http-mainnet.hoosmartchain.com',
      timeout: 1000 * 60,
      accounts: [process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000'],
    },
  },
  etherscan: {
    apiKey: process.env.SCAN_KEY,
  },
};
