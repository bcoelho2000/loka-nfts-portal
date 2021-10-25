import * as React from "react";
import './styles/App.css';

import ReactNotifications from 'react-notifications-component';
import { store } from 'react-notifications-component';
import { ethers } from "ethers";
import 'react-notifications-component/dist/theme.css';
import 'animate.css/animate.min.css';
import loadingGIF from "./assets/loading.gif";
import lokalsNft from './utils/LokalsNft.json';

// Constants
const OPENSEA_LINK = '';
const TOTAL_MINT_COUNT = 50;
const CONTRACT_ADDRESS = "0x2fd07B3E6b070D1e05fA9f48b9581deA36a4dB0d";

export default class LokalsNftApp extends React.Component
{
	ethereum = null;

	constructor(props)
	{
		console.log("LokalsNftApp ctor() start");
		super(props)

		this.state =
		{
			currentAccount:"",
			appTotalNFTs:0,
			appTotalNFTsMax:0,
			appIsMinting:false
		}
		console.log("LokalsNftApp ctor() end");
	}

	displayNotification(title, msg, type = "success", insert = "top", container = "top-left", dismiss = {duration: 5000, onScreen: true})
	{
		//	 success	 danger	 info	 default	 warning

		console.log(store,'addNotificationaddNotificationaddNotification')
		store.addNotification({
			title: title,
			message: msg,
			type: type,
			insert: insert,
			container: container,
			animationIn: ["animate__animated", "animate__fadeIn"],
			animationOut: ["animate__animated", "animate__fadeOut"],
			dismiss: dismiss
		});

	}

	_setupEthereum()
	{
		this.ethereum = window.ethereum;

		if (!this.ethereum)
		{
			console.log("Make sure you have metamask!");
			this.displayNotification("Metamask is required!",
			"Go to https://metamask.io/download and install Metamask. Then get some ETH from Rinkeby (Test Network) by using https://app.mycrypto.com/faucet. After that you can connect your wallet by clicking the button below.", "danger", "top", "top-full",
			{
				duration: 0,
				showIcon: true,
				click:false
			});
			return false;
		}
		console.log("We have the ethereum object", this.ethereum);
		return true;
	}

	nftContract = null;
	getNFTContract = () =>
	{
		try
		{
			console.log("getNFTContract exec start");
			if(!this._setupEthereum())
				return null;

			if(this.nftContract==null)
			{
				console.log("getting provider for NFT contract and saving local variable.");
				const provider = new ethers.providers.Web3Provider(this.ethereum);
				const signer = provider.getSigner();
				this.nftContract = new ethers.Contract(CONTRACT_ADDRESS, lokalsNft.abi, signer);
				return this.nftContract;
			}
		}
		catch (error) {
			console.log(error);
			this.displayNotification("getNFTContract Ooops... "+error.name,
			error.message,
			"danger", "top-full", "top",
			{
				duration: 0,
				showIcon: true,
				click: false,
				touch: false
			});
		}
		console.log("returning NFT contract.");
		return this.nftContract;
	}

	checkIfWalletIsConnected = () =>
	{
		if(!this._setupEthereum())
			return;

		const acc = this.state.currentAccount;
		if(acc!=null && acc!="")
		{
			console.log("Wallet already connected in state. Skipping calling eth_accounts. Account: %s", acc)
			return;
		}

		//The return value of eth_accounts is ultimately controlled by the Wallet or Client.
		// In order to protect user privacy, the authors recommend not exposing any accounts by default.
		// Instead, Providers should support RPC methods for explicitly requesting account access, such as eth_requestAccounts (see EIP-1102)
		//  or wallet_requestPermissions (see EIP-2255).


		this.ethereum.request({ method: 'eth_accounts'})
		.then(accounts =>
		{
			if(accounts.length !== 0)
			{
				const account = accounts[0];
				console.log("Wallet connected on account: ", account);
				this.displayNotification("Wallet required", `Found an authorized account: ${account}`);

				this.setState({currentAccount: account});

				this.refreshApp();
			}
			else
			{
				console.log("Wallet not connected :(");

				this.setState({currentAccount: ""});

				this.displayNotification("No accounts found!",
				"Go to https://metamask.io/download and install Metamask. Then get some ETH from Rinkeby (Test Network) by using https://app.mycrypto.com/faucet. After that you can connect your wallet by clicking the button below.",
				"danger", "top-full", "top",
				{
					duration: 0,
					showIcon: true,
					click: false,
					touch: false
				});

			}
		});
	}

		connectWallet = async () =>
		{
			console.log("connectWallet start");
			// https://docs.metamask.io/guide/rpc-api.html#table-of-contents

			try
			{
				if(!this._setupEthereum())
					return null;

				if(!this.checkIfWalletIsConnected())
				{
					const accounts = await this.ethereum.request({ method: "eth_requestAccounts" });
					if(accounts.length !== 0)
					{
						const account = accounts[0];
						console.log("Found an authorized account: ", account);
						this.displayNotification("Wallet", `Found an authorized account on your wallet: ${account}`);

						this.setState({currentAccount: account});

						this.refreshApp();

						console.log("connectWallet finish");
						return;
					}

					// Oh no...
					console.log("No authorized accounts found...");
					this.displayNotification("No authorized accounts found!",
					"Go to https://metamask.io/download and install Metamask. Then get some ETH from Rinkeby (Test Network) by using https://app.mycrypto.com/faucet. After that you can connect your wallet by clicking the button below.",
					"danger", "top-full", "top",
					{
						duration: 0,
						showIcon: true,
						click: false,
						touch: false
					});
					console.log("connectWallet finish");
				}

			}
			catch (error)
			{
				console.log(error);
				this.displayNotification("connectWallet Ooops... "+error.name, error.message, "danger", "top-full", "top",
				{
					duration: 0,
					showIcon: true,
					click: false,
					touch: false
				});
			}
		}



		setupEventListener = async () =>
		{
			console.log("setupEventListener start!");

			try
			{
				let connectedContract = this.getNFTContract();

				//	event NewNFTMinted(address sender, uint256 tokenId, string nftName, uint totalNFTs, uint totalNFTsMax);
				if(connectedContract.listenerCount("NewNFTMinted") == 0)
				{
					console.log("Register Event Listener on event NewNFTMinted");
					connectedContract.on("NewNFTMinted", (eSender, eTokenId, eNftName, eTotalNFTs, eTotalNFTsMax) =>
					{
						console.log("NewNFTMinted event! eSender:(%s) eTokenId(%s) eNftName(%s) eTotalNFTs(%s) eTotalNFTsMax(%s)", eSender, eTokenId.toNumber(), eNftName, eTotalNFTs.toNumber(), eTotalNFTsMax.toNumber());
						console.log("comparing %s vs %s", this.state.currentAccount, eSender);
						if(this.state.currentAccount.toUpperCase() == eSender.toUpperCase() )
						{
							this.displayNotification("YOU GOT A NEW NFT!",
							`You just got the NFT (${eNftName})! It's ${eTotalNFTs} out of ${eTotalNFTsMax}!!! It can take a max of 10 min to show up on OpenSea. Here's the link: https://testnets.opensea.io/assets/${CONTRACT_ADDRESS}/${eTokenId.toNumber()}`,
							"success");
						}
						else
						{
							this.displayNotification("NEW NFT DELIVERED!",
							`Someone just got NFT number ${eTotalNFTs} out of ${eTotalNFTsMax}!`,
							"info");
						}

						this.setState({
							appTotalNFTs: eTotalNFTs.toNumber()+1,
							appTotalNFTsMax: eTotalNFTsMax.toNumber()
						});

					});
				}
				console.log("setupEventListener finish");
			}
			catch (error)
			{
				console.log(error);
				this.displayNotification("setupEventListener Ooops... "+error.name, error.message, "danger", "top-full", "top",
				{
					duration: 0,
					showIcon: true,
					click: false,
					touch: false
				});
			}
		}

		getTotalNfts = async () =>
		{
			console.log("getTotalNfts exec!");
			try
			{
				let resTotalNFTs = await this.getNFTContract().getTotalNFTs();
				this.setState({appTotalNFTs: resTotalNFTs.toNumber()});
			}
			catch (error)
			{
				console.log(error);
				this.displayNotification("getTotalNfts Ooops... "+error.name,
				error.message,
				"danger", "top-full", "top",
				{
					duration: 0,
					showIcon: true,
					click: false,
					touch: false
				});
			}
		}

		getTotalMaxNfts = async () =>
		{
			console.log("getTotalMaxNfts exec!");
			try
			{
				let resTotalMaxNFTs = await this.getNFTContract().getTotalMaxNFTs();
				this.setState({appTotalNFTsMax: resTotalMaxNFTs.toNumber()});
			}
			catch (error)
			{
				console.log(error);
				this.displayNotification("getTotalMaxNfts Ooops... "+error.name,
				error.message,
				"danger", "top-full", "top",
				{
					duration: 0,
					showIcon: true,
					click: false,
					touch: false
				});
			}
		}

		refreshApp = () =>
		{
			this.getTotalNfts();
			this.getTotalMaxNfts();
		}

		componentDidMount()
		{
			console.log("componentDidMount start");
			if(this._setupEthereum())
			{
				this.checkIfWalletIsConnected();
				this.setupEventListener();
			}
			console.log("componentDidMount end");
		}

		componentWillUnmount()
		{
			console.log("componentWillUnmount start");
			console.log("componentWillUnmount end");
		}

		askContractToMintNft = async () =>
		{
			this.setState({appIsMinting: true});

			try
			{
				const connectedContract = this.getNFTContract();

				console.log("Going to pop wallet now to pay gas...")
				let nftTxn = await connectedContract.mintNFT();

				console.log("Mining...please wait.")
				this.displayNotification("Mining", "Please wait...", "info");
				await nftTxn.wait();

				console.log(`Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
				this.displayNotification("Success!", `Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
			}
			catch (error)
			{
				console.log(error.message);
				this.displayNotification("Error!", error.message, "danger",	"top-full", "top", { duration: 0,	click: false,	showIcon: true } );
			}

			this.setState({appIsMinting: false});
		}

			// Render Methods
			renderNotConnectedContainer = () => (
				<button onClick={this.connectWallet} className="cta-button connect-wallet-button">
				Connect to Wallet
				</button>
			);

			renderMintUI = () => (
				<button onClick={this.askContractToMintNft} className="cta-button mint-button">
				{this.state.mintingStatus ? "Minting..." : "Mint NFT" }
				</button>
			);

			renderNFTstats = () => (
				<p className="mint-count">There are {this.state.appTotalNFTsMax-this.state.appTotalNFTs} Lokals left out of {this.state.appTotalNFTsMax}!</p>
			);

			seeNFTCollection = () => (
				window.open("https://testnets.opensea.io/collection/lokalsnft-v2","_blank")
			);

  render ()
  {
		return <div className="appRoot">
	    <ReactNotifications/>
	    <div className="App">
	      <div className="container">
	        <div className="header-container">
	          <p className="header gradient-text">Lokals NFT Collection</p>
	          <p className="sub-text">
	            Get your unique Loka NFTs
	          </p>
						<div className="content-container">
	            {this.state.appIsMinting ? <div className="loading"><img src={loadingGIF}/></div> : ""}
	            {this.state.currentAccount === "" ? this.renderNotConnectedContainer() 	: this.state.appIsMinting ? "" : this.renderMintUI() }
	            {this.state.currentAccount === "" ? "" 	: this.renderNFTstats()	}
						</div>
	        </div>
	        <div className="footer-container footer-text">
            <div className="content-container">
              <button onClick={this.seeNFTCollection} className="cta-button connect-wallet-button">
                Check the entire Loka NFT collection
              </button>
            </div>
	        </div>
	      </div>
	    </div>
		</div>
  }

}
