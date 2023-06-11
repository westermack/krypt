const hre = require("hardhat");

const main = async () => {
  const transactionsContract = await hre.ethers.deployContract("Transactions");

  await transactionsContract.waitForDeployment();

  console.log("Transactions contract address: " + transactionsContract.address);
};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

runMain();
