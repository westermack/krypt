require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
  solidity: "0.8.0",
  networks: {
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/ifr6ZmBQY8551qSFuk9__j3-IzW-xQdG",
      accounts: [
        "1c19a49864e7d7ef6e08d2227107584a377956768f3712463c4c6e2618b62b6a",
      ],
    },
  },
};
