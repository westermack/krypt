import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractABI, contractAddress } from "../utils/constants";

export const TransactionContext = React.createContext();

const APIKEY = import.meta.env.VITE_INFURA_API;
const SIGNER_KEY = import.meta.env.VITE_SIGNER_PRIVATE_KEY;
let { ethereum } = window;
let provider;
let signer = null;

if (ethereum == null) {
  // If MetaMask or any other wallet that injects the Ethereum
  // provider, as specified by EIP-1193, into the browser
  // at window.ethereum, is not installed, we use the default provider,
  // which is backed by a variety of third-party services (such
  // as INFURA). They do not have private keys installed so are
  // only have read-only access
  console.log("MetaMask not installed; using read-only defaults");
  provider = ethers.getDefaultProvider();
} else {
  // If the user has multiple wallet browser extensions installed
  // that inject ethereum providers (e.g., both MetaMask and Coinbase Wallet),
  // Coinbase Wallet's injected provider will construct a "multiprovider"
  // array at window.ethereum.providers containing the injected provider
  // from each wallet. Coinbase Wallet can be identified in this array by the
  // isCoinbaseWallet property, while MetaMask by the isMetaMask property.

  // Edge case if MM and CBW are both installed
  if (ethereum.providers?.length) {
    window.ethereum.providers.forEach(async (p) => {
      if (p.isMetaMask) {
        ethereum = p;
        return;
      }
    });
  }

  //Connect to Ethereum via INFURA API for read-only requests.
  provider = new ethers.providers.JsonRpcProvider(
    `https://sepolia.infura.io/v3/${APIKEY}`
  );

  //Creating a signing account from a private key
  signer = new ethers.Wallet(SIGNER_KEY, provider);

  // Or connect to the MetaMask/wallet EIP-1193 object. This is a standard
  // protocol that allows Ethers access to make all read-only
  // requests through MetaMask.

  // provider = new ethers.providers.Web3Provider(ethereum);

  // It also provides an opportunity to request access to write
  // operations, which will be performed by the private key
  // that MetaMask/wallet manages for the user.

  //signer = provider.getSigner()
}

export const TransactionsProvider = ({ children }) => {
  const [formData, setformData] = useState({
    addressTo: "",
    amount: "",
    keyword: "",
    message: "",
  });
  const [currentAccount, setCurrentAccount] = useState(
    "pure for visual effects"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount")
  );
  const [transactions, setTransactions] = useState([]);

  const getEthereumContract = (contractAddress, contractABI, provider) => {
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );

    return contract;
  };

  const handleChange = (e, name) => {
    setformData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const getAllTransactions = async () => {
    try {
      if (ethereum) {
        const transactionsContract = getEthereumContract(
          contractAddress,
          contractABI,
          provider
        );

        const availableTransactions =
          await transactionsContract.getAllTransactions();

        const structuredTransactions = availableTransactions.map(
          (transaction) => ({
            addressTo: transaction.receiver,
            addressFrom: transaction.sender,
            timestamp: new Date(
              transaction.timestamp.toNumber() * 1000
            ).toLocaleString(),
            message: transaction.message,
            keyword: transaction.keyword,
            amount: parseInt(transaction.amount._hex) / 10 ** 18,
          })
        );

        console.log(structuredTransactions);

        setTransactions(structuredTransactions);
      } else {
        console.log("Ethereum is not present");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const checkIfWalletIsConnect = () => {
    if (ethereum.isMetaMask) {
      ethereum.isConnected() && setCurrentAccount(ethereum.selectedAddress);
    }
    //Can chose to handle logic for some other wallet like Coinbase Wallet
  };

  const checkIfTransactionsExists = async () => {
    try {
      if (ethereum) {
        const transactionsContract = getEthereumContract(
          contractAddress,
          contractABI,
          provider
        );

        const currentTransactionCount =
          await transactionsContract.getTransactionCount();
        console.log(currentTransactionCount);
        window.localStorage.setItem(
          "transactionCount",
          currentTransactionCount
        );
      }
    } catch (error) {
      if (error.code === 4001) {
        console.log("Please connect to MetaMask.");
      } else {
        //console.log(error.code);
        console.error(error);
      }
    }
  };

  const connectWallet = async (e) => {
    if (!ethereum.isMetaMask) return alert("Please install MetaMask.");

    let target = e.target;
    if (target.nodeName === "path") {
      target = target.parentNode.parentNode;
    } else if (target.nodeName === "svg") {
      target = target.parentNode;
    }
    target.disabled = true;

    const accounts = await ethereum
      .request({
        method: "eth_requestAccounts",
      })
      .catch((err) => {
        if (err.code === 4001) {
          // EIP-1193 userRejectedRequest error
          // If this happens, the user rejected the connection request.
          console.log("Please connect to MetaMask.");
        } else {
          console.error(err);
        }
        console.error(err);
      })
      .finally(() => {
        target.disabled = false;
      });

    if (accounts && accounts.length) {
      setCurrentAccount(accounts[0]);
      //window.location.reload();
    }
  };

  const sendTransaction = async (e) => {
    try {
      if (ethereum) {
        const { addressTo, amount, keyword, message } = formData;

        const transactionsContract = getEthereumContract(
          contractAddress,
          contractABI,
          signer
        );

        const parsedAmount = ethers.utils.parseEther(amount);

        await ethereum
          .request({
            method: "eth_sendTransaction",
            params: [
              {
                from: currentAccount,
                to: addressTo,
                gas: "0x5208", //2100 GWEI
                value: parsedAmount._hex,
              },
            ],
          })
          .catch((err) => {
            if (err.code === 4001) {
              // EIP-1193 userRejectedRequest error
              // If this happens, the user rejected the connection request.
              console.log("Please connect to MetaMask.");
            } else {
              console.error(err);
            }
            console.error(err);
            e.target.disabled = false;
            return;
          })
          .finally(() => {
            //e.target.disabled = false;
          });

        setIsLoading(true);

        const transactionHash = await transactionsContract.addToBlockchain(
          addressTo,
          parsedAmount,
          message,
          keyword
        );

        console.log(`Loading - ${transactionHash.hash}`);
        await transactionHash.wait();
        console.log(`Success - ${transactionHash.hash}`);
        e.target.disabled = false;
        setIsLoading(false);

        const transactionsCount =
          await transactionsContract.getTransactionCount();

        setTransactionCount(transactionsCount.toNumber());
        //window.location.reload();
      } else {
        console.log("No ethereum provider object");
      }
    } catch (error) {
      e.target.disabled = false;
      console.error(error);
    }
  };

  useEffect(() => {
    checkIfWalletIsConnect();
    checkIfTransactionsExists();
    getAllTransactions();
  }, [transactionCount]);

  return (
    <TransactionContext.Provider
      value={{
        transactionCount,
        connectWallet,
        transactions,
        currentAccount,
        isLoading,
        sendTransaction,
        handleChange,
        formData,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
