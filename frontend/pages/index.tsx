import { FC, useState } from "react";
import { ethers, BigNumber } from "ethers";

import { UbiquityAlgorithmicDollar__factory } from "../src/artifacts/types/factories/UbiquityAlgorithmicDollar__factory";
import { IMetaPool__factory } from "../src/artifacts/types/factories/IMetaPool__factory";
import { Bonding__factory } from "../src/artifacts/types/factories/Bonding__factory";
import { BondingShare__factory } from "../contracts/artifacts/types/factories/BondingShare__factory";
import { UbiquityAlgorithmicDollarManager__factory } from "../contracts/artifacts/types/factories/UbiquityAlgorithmicDollarManager__factory";
import { UbiquityAlgorithmicDollarManager } from "../contracts/artifacts/types/UbiquityAlgorithmicDollarManager";
import { ERC20__factory } from "../contracts/artifacts/types/factories/ERC20__factory";

import FullDeployment from "../src/uad-contracts-deployment.json";

const Index: FC = (): JSX.Element => {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider>();
  const [account, setAccount] = useState<string>();
  const [tokenBalance, setTokenBalance] = useState<string>();
  const [tokenLPBalance, setLPTokenBalance] = useState<string>();
  const [curveTokenBalance, setCurveTokenBalance] = useState<string>();
  const [
    tokenBondingSharesBalance,
    setBondingSharesBalance,
  ] = useState<string>();
  const [manager, setManager] = useState<UbiquityAlgorithmicDollarManager>();
  return (
    <>
      <button onClick={connect}>Connect</button>
      <p>Account: {account}</p>
      <button onClick={getTokenBalance}>Get uAD Token Balance</button>
      <p>uAD Balance: {tokenBalance}</p>
      <button onClick={getLPTokenBalance}>Get LP Token Balance</button>
      <p>uAD3CRV-f Balance: {tokenLPBalance}</p>
      <button onClick={getCurveTokenBalance}>Get curve Token Balance</button>
      <p>3CRV Balance: {curveTokenBalance}</p>
      <input
        type="text"
        name="lpsAmount"
        id="lpsAmount"
        placeholder="lpsAmount"
      />
      <input type="text" name="weeks" id="weeks" placeholder="weeks" />
      <button onClick={depositBondingTokens}>
        Deposit Bonding Token Balance
      </button>
      <p>Token Balance: {tokenBondingSharesBalance}</p>

      {renderTasklist()}
    </>
  );

  async function connect() {
    if (!window.ethereum?.request) {
      alert("MetaMask is not installed!");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    setProvider(provider);
    setAccount(accounts[0]);
    const MANAGER_ADDR =
      FullDeployment.contracts.UbiquityAlgorithmicDollarManager.address;
    const manager = UbiquityAlgorithmicDollarManager__factory.connect(
      MANAGER_ADDR,
      provider
    );
    setManager(manager);
  }

  async function getTokenBalance() {
    if (provider && account) {
      const TOKEN_ADDR =
        FullDeployment.contracts.UbiquityAlgorithmicDollar.address; // "0x8b01F55C4D57d9678dB76b7082D9270d11616F78";

      const token = UbiquityAlgorithmicDollar__factory.connect(
        TOKEN_ADDR,
        provider
      );
      console.log(`
        account:${account}
        rawBalance:${rawBalance}
        `);
      const rawBalance = await token.balanceOf(account);
      const decimals = await token.decimals();

      const balance = ethers.utils.formatUnits(rawBalance, decimals);
      setTokenBalance(balance);
    }
  }
  async function getLPTokenBalance() {
    if (provider && account && manager) {
      const TOKEN_ADDR = await manager.stableSwapMetaPoolAddress();
      const token = IMetaPool__factory.connect(TOKEN_ADDR, provider);

      const rawBalance = await token.balanceOf(account);
      const decimals = await token.decimals();

      const balance = ethers.utils.formatUnits(rawBalance, decimals);
      setLPTokenBalance(balance);
    }
  }
  async function getCurveTokenBalance() {
    if (provider && account && manager) {
      const TOKEN_ADDR = await manager.curve3PoolTokenAddress();
      const token = ERC20__factory.connect(TOKEN_ADDR, provider);

      const rawBalance = await token.balanceOf(account);
      const decimals = await token.decimals();

      const balance = ethers.utils.formatUnits(rawBalance, decimals);
      setCurveTokenBalance(balance);
    }
  }
  async function depositBondingToken(
    lpsAmount: ethers.BigNumber,
    weeks: ethers.BigNumber
  ) {
    if (provider && account && manager) {
      const BONDING_ADDRESS = FullDeployment.contracts.Bonding.address;
      const METAPOOL_ADDRESS = await manager.stableSwapMetaPoolAddress();
      const BONDING_SHARE_ADDRESS =
        FullDeployment.contracts.BondingShare.address;
      // (method) Bonding__factory.connect(address: string, signerOrProvider: ethers.Signer | ethers.providers.Provider): Bonding
      const bondingContract = Bonding__factory.connect(
        BONDING_ADDRESS,
        provider.getSigner()
      );
      // (method) IMetaPool__factory.connect(address: string, signerOrProvider: ethers.Signer | ethers.providers.Provider): IMetaPool
      const metapoolContract = IMetaPool__factory.connect(
        METAPOOL_ADDRESS,
        provider.getSigner()
      );
      // (method) BondingShare__factory.connect(address: string, signerOrProvider: Signer | Provider): BondingShare

      // check approved amount

      // make sure to check balance spendable -- if (lpsAmount) is > spendable then ask approval again

      console.log(account);

      const allowance = await metapoolContract.allowance(
        account,
        BONDING_ADDRESS
      );
      console.log("allowance", ethers.utils.formatEther(allowance));
      console.log("lpsAmount", ethers.utils.formatEther(lpsAmount));
      let approveTransaction;
      if (allowance.lt(lpsAmount))
        approveTransaction = await metapoolContract.approve(
          BONDING_ADDRESS,
          lpsAmount
        );
      const approveWaiting = await approveTransaction.wait();

      console.log(
        { lpsAmount, weeks }
        // await bondingContract.deposit()
      );
      const depositWaiting = await bondingContract.deposit(lpsAmount, weeks);
      const waiting = await depositWaiting.wait();
      console.log(
        `gas used with 100 gwei / gas:${ethers.utils.formatEther(
          waiting.gasUsed.mul(ethers.utils.parseUnits("100", "gwei"))
        )}`
        // await bondingContract.deposit()
      );
      //

      const bondingShareContract = BondingShare__factory.connect(
        BONDING_SHARE_ADDRESS,
        provider
      );

      console.log({ bondingShareContract });

      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      console.log({ addr });
      const ids = await bondingShareContract.holderTokens(addr);
      console.log(`
      ids of bonding shares
      length:${ids.length}
      0:${ids[0]}
      1:${ids[1]}
      `);

      const bondingSharesBalance = await bondingShareContract.balanceOf(
        addr,
        ids[0]
      );

      console.log({ ids, bondingSharesBalance });

      //
      let balance = BigNumber.from("0");
      if (ids.length > 1) {
        ids.forEach(async (id) => {
          const bondingIDbal = await bondingShareContract.balanceOf(addr, id);
          console.log(`
          bondingIDbal: ${bondingIDbal.toString()} 
          `);

          balance = balance.add(bondingIDbal);
        });
      } else {
        balance = bondingSharesBalance;
      }
      console.log(`
      balance:${balance.toString()} 
      `);
      setBondingSharesBalance(balance.toString());
    } else {
      console.error(`no provider and account found`);
    }
  }
  function depositBondingTokens() {
    // () => {
    const lpsAmount = document.getElementById("lpsAmount") as HTMLInputElement;
    const lpsAmountValue = lpsAmount?.value;
    const weeks = document.getElementById("weeks") as HTMLInputElement;
    const weeksValue = weeks?.value;

    if (!lpsAmountValue || !weeksValue) {
      console.error(`missing input value for lp token amount or weeks`);
    } else {
      return depositBondingToken(
        BigNumber.from(lpsAmountValue),
        BigNumber.from(weeksValue)
      );
    }
    // }
  }
};

export default Index;

function renderTasklist() {
  return (
    <>
      <h1>tasklist</h1>
      <ol>
        <li>pending ugov reward</li>
        <li>bonding shares inputs</li>
        <li>for weeks and LP token amount</li>
        <li>link to crv.finance</li>
      </ol>
    </>
  );
}
