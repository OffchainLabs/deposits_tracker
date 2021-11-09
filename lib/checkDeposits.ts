import ethers from "ethers";
import { L1ERC20Gateway__factory, BridgeHelper, Bridge } from "arb-ts";
import { instantiateBridge } from "../instantiate_bridge";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));


const getDepositInitiatedEventData = async (
  l1GatewayAddress: string,
  filter: ethers.providers.Filter,
  l1Provider: ethers.providers.Provider
) => {
  const contract = L1ERC20Gateway__factory.connect(
    l1GatewayAddress,
    l1Provider
  );
  const logs = await BridgeHelper.getEventLogs(
    "DepositInitiated",
    contract,
    undefined,
    filter
  );
  return logs;
};

const checkDeposits = async (
  bridge: Bridge,
  gatewayAddress: string,
  fromBlock: number,
  toBlock: number
)=> {
  let x: any = await getDepositInitiatedEventData(
    gatewayAddress,
    { fromBlock, toBlock },
    bridge.l1Provider
  );
  const info = `checking bridge address ${gatewayAddress}, ${x.length} txns from blocks ${fromBlock} to ${toBlock}`;
  console.log(info);

  for (const depositLog of x) {    
    await wait(3000);
    const { transactionHash } = depositLog;

    const rec = await bridge.l1Provider.getTransactionReceipt(transactionHash);

    /** Every message put in the Arbitrum Inbox is identified by a unique Sequence number */
    const seqNumArray = await bridge.getInboxSeqNumFromContractTransaction(rec);

    /** (sanity check/ appeasing the compoiiler; since we got the transactions from DepositInitiated event logs, there's no reason they should have no sequencer numbers) */
    if (!seqNumArray) throw new Error("No seq numbers found; txn wasn't really a deposit (?)");


    /** Normally, an L1 txn will send one message to L2, but in principle it could send many, so we iterate over seqNumArray */
    for (let index = 0; index < seqNumArray.length; index++) {
      const seqNum = seqNumArray[index];

      //** An L1 to L2 message produces 3 l2 txn receipts: */


      //** Ticket creation txn: success indicates execution on L2 can now be attempted; failure indicates the deposit attempt has failed, full stop */
      const l1ToL2TicketCreationHash = await bridge.calculateL2TransactionHash(seqNum);

      //** Auto-redeem 'record': success indicates "automatic" execution on L2 succeeded; failure indicates the L2 txn will have to be "retried" in order to succeed */
      const autoRedeemHash= await bridge.calculateRetryableAutoRedeemTxnHash(
        seqNum
      );


      /** User txn: this is the L2 transaction associated with a deposit that represents the actual l2; i.e., the one the user wants to see/cares about.  
       * Gets emitted only when the L2 side succeeds (either from an autoredeem or from a manual redeem) 
      
      */
      const userTxnHash = await bridge.calculateL2RetryableTransactionHash(seqNum);
  
      
          console.log('');
          console.log('Deposit txns:');
          console.log('L1 txn:',transactionHash );
          console.log('Ticket creation:', l1ToL2TicketCreationHash);
          console.log('Autoredeem record:',autoRedeemHash );
          console.log(`User's L2 txn:`,userTxnHash );
          
      
  
      }
    }
    
    
    
    
    
    


  console.log(
    `Done with ${gatewayAddress}, blocks ${fromBlock} to ${toBlock}`
  );
};

const checkDepositsFromAllTokenGateways = async () => {

  const { bridge, l1Network } = await instantiateBridge();
  const fromBlock = 0
  const toBlock = await bridge.l1Provider.getBlockNumber()


  const standardBridgeResult = await checkDeposits(
    bridge,
    l1Network.tokenBridge.l1ERC20Gateway,
    fromBlock,
    toBlock
  );
  const customBridgeResult = await checkDeposits(
    bridge,
    l1Network.tokenBridge.l1CustomGateway,
    fromBlock,
    toBlock
  );
  const wethGatewayResult = await checkDeposits(
    bridge,
    l1Network.tokenBridge.l1WethGateway,
    fromBlock,
    toBlock
  );

  const daiGatewayResult = await checkDeposits(
    bridge,
    l1Network.tokenBridge.l1DaiGateway,
    fromBlock,
    toBlock
  );

};


checkDepositsFromAllTokenGateways()