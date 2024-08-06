const { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, SystemProgram } = require('@solana/web3.js');
const { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } = require('date-fns');
const { TOKEN_PROGRAM_ID, AccountLayout } = require('@solana/spl-token');
const { Metaplex } = require('@metaplex-foundation/js');

const { sendMessage, sendMessageSync, sendPhoto } = require('./send-message.js');

const dotenv = require('dotenv');
dotenv.config();

const RPC_URL = process.env.RPC_URL;
const TARGET_WALLET_LIST = process.env.TARGET_WALLET_LIST;

let alertState = false;

let bot = null;
let chatId = null;

function initBot(_bot, _chatId) {
    bot = _bot;
    chatId = _chatId;
}

function setState(state) {
    alertState = state;
}

function alertMessage(message) {
    sendMessage(bot, chatId, message, false);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function arrayDifference(arr1, arr2) {
    return arr1.filter(element => !arr2.includes(element));
}


async function getTokenMetaData(connection, tokenMint) {
    const metaplex = Metaplex.make(connection);
    const metadataAccount = metaplex
            .nfts()
            .pdas()
            .metadata({ mint: tokenMint });

    const metadataAccountInfo = await connection.getAccountInfo(metadataAccount);
    if (metadataAccountInfo) {
        let token = await metaplex.nfts().findByMint({ mintAddress: tokenMint });
        tokenName = token.name;
        tokenSymbol = token.symbol;
        token.mintAddress = tokenMint.toString();
        return token
    } else
        return null
}

async function monitorWallet() {
    // Set up connection
    const connection = new Connection(RPC_URL, {
        commitment: 'confirmed',
    });

    const walletAddresses = TARGET_WALLET_LIST.split('\n').filter((wallet, index) => {
        if (wallet != '')
            return wallet;
    });

    let walletTokenLists = walletAddresses.reduce((acc, addr) => {
        acc[addr] = { prevTokenList: [], curTokenList: []};
        return acc;
    }, {});


    while (true) {
        for (const walletAddr of walletAddresses) {
            const walletPublicKey = new PublicKey(walletAddr);
            const filter = { programId: TOKEN_PROGRAM_ID };
            const tokenAccounts = await connection.getTokenAccountsByOwner(walletPublicKey, filter);
        
            console.log(`Token Accounts for wallet ${walletAddr}:`, tokenAccounts.value.length);
        
            walletTokenLists[walletAddr].curTokenList = [];
        
            for (const tokenAccount of tokenAccounts.value) {
                const accountData = AccountLayout.decode(tokenAccount.account.data);
                const tokenPublicKey = new PublicKey(accountData.mint);
                const tokenBalance = await connection.getTokenAccountBalance(tokenAccount.pubkey);
        
                console.log(`Token: ${tokenPublicKey.toBase58()}, Balance: ${tokenBalance.value.uiAmount}`);
        
                walletTokenLists[walletAddr].curTokenList.push(tokenPublicKey.toString());
            }
        
            const result = arrayDifference(walletTokenLists[walletAddr].curTokenList, walletTokenLists[walletAddr].prevTokenList);
            if (result.length > 0 && walletTokenLists[walletAddr].prevTokenList.length > 0) {
                console.log(`New Token Detected for wallet ${walletAddr}:`, result[0]);
                // Handle new token detection (e.g., notify user)
                const tokenMint = new PublicKey(result[0]);
                const token = await getTokenMetaData(connection, tokenMint);
                token.wallet = walletAddr;
                console.log(token.name, token.symbol);
                log_token_detection(token);
            }
            
            walletTokenLists[walletAddr].prevTokenList = [...walletTokenLists[walletAddr].curTokenList];
        }

        // Sleep for a specified interval before the next check
        await sleep(1000);  // 10 seconds
    }
}


function log_token_detection(token) {
  try {
    const message = `🚀 NEW TOKEN DETECTOR

📢 Status
 NEW

💎 Name
${token.name}    

📌 Symbol
${token.symbol}

📋 Mint Address
${token.mintAddress}

🏆 Wallet
${token.wallet}

📊 Solscan
<a href="https://solscan.io/token/${token.mintAddress}">https://solscan.io/token/${token.mintAddress}</a>

📈 Dexscreener
<a href="https://dexscreener.com/solana/${token.mintAddress}">https://dexscreener.com/solana/${token.mintAddress}</a>`;

    if (alertState) {
      alertMessage(message);
      console.log(message);
    }      

  } catch (e) {
    console.log(e);
  }
}

module.exports = { initBot, monitorWallet, setState }

