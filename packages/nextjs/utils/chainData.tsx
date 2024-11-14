import { base, baseSepolia, mainnet, sepolia } from "viem/chains";

// SEPOLIA
// 👋 Minted ERC20 Factory 0xf9934F67adfAE46E3e5c996f6123AD093Bb3C2BF
// deploying "ERC20Ownable" (tx: 0xef67ced4646144487d1c18db7d1c690ae0b877021ba7434d5306456e434a3c7c)...: deployed at 0x7c198d1579aeaF2AdfFff15EEb8C86BFF3dE149C with 2646838 gas
// ✅ LEGT Governance Token 0x7c198d1579aeaF2AdfFff15EEb8C86BFF3dE149C

// BASE SEPOLIA
// 👋 Minted ERC20 Factory 0xdF0C39848B5A848bCfFa35adBcD7BC35955a9220
// deploying "ERC20Ownable" (tx: 0xe8628f6cc740a8ad6a59ae975a0f17a85970381219361ebada73161bf934c13e)...: deployed at 0x8388C6788D3921658420b016473c8293C1a81A85 with 2646838 gas
// ✅ LEGT Governance Token 0x8388C6788D3921658420b016473c8293C1a81A85
// reusing "NFTFactory" at 0x4A8038B012Ff192B53ED4537C75e5Ae241C5F962
// ✅ LEGT Factory 0x4A8038B012Ff192B53ED4537C75e5Ae241C5F962
// reusing "TokenSale" at 0x81dfa8F523D865323dB0e2727513F1c0331E890F
// ✅ Token Sale 0x81dfa8F523D865323dB0e2727513F1c0331E890F

// KINTO Most Recnet
// KYC NFT => 0x723050d90cd9D28868E4115beF77e0a181e4E475
// KYC ERC20 => 0x63Ab39CaCe56889a0feCE3757e5461176c1256eB

interface ChainData {
  [key: string]: any;
  defaultPDFHash: string;
  linkedPdfKey: string;
  linkedPoolKey: string;
  baseIPFSUrl: string;
  kycChainId: number;
  kycContractAddress: string;
  emptyAddress: string;
  nftFactoryKycAddress: string;
}
const chainData: ChainData = {
  externalKey: "external_url",
  linkedPdfKey: "linked_document",
  linkedPoolKey: "liquidity_pool",
  baseIPFSUrl: "https://ipfs-gateway.legt.co/ipfs/",
  defaultPDFHash: "bafybeicqz376dgkrmrykjcrdafclqke4bzzqao3yymbbly4fjr4kdwttii",
  kycContractAddress: "0x33F28C3a636B38683a38987100723f2e2d3d038e",
  kycChainId: 7887,
  emptyAddress: "0x0000000000000000000000000000000000000000",
  // nftFactoryKycAddress: "0xe09d66ab872Da89b2d875E7c86cBe7cC5e3667EA",
  nftFactoryKycAddress: "0x723050d90cd9D28868E4115beF77e0a181e4E475",
  31337: {
    stable: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
  },
  84532: {
    ...baseSepolia,
    // stable:,
    // govern:,
    rpc: "https://base-sepolia.blockpi.network/v1/rpc/public",
  },
  11155111: {
    ...sepolia,
    rpc: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_SEPOLIA}`,
    graph: "https://api.thegraph.com/subgraphs/name/tonynacumoto/uniswap-v3-sepolia-legt",
    publicChatId: "583cb9542a56b27264e7376b3e62fa4dbc9268a6638e8f385b2ceace2d18cf44",
    privateChatId: "e12462634069fdab6a3f09b364eea9a8ed04a3efbfd1fe0f49a4e5b1e2a60012",
    // STABLE: 0x8A9F16CF0096ABC81070AA3E0d8517C9905Ff2Ef => just for reference, use deployed contract data in code
    // A:LOFT POOL: 0xacf60e6c708f5eacc2c274e523ffe5e28b014969 => just for reference
  },
  8453: {
    ...base,
    rpc: "https://eth-sepolia.g.alchemy.com/v2/1CpEoNtdBVTXWfckIt7Po74oBOfAuXP_",
  },
  1: {
    ...mainnet,
    rpc: `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_MAINNET}`,
  },
};

export default chainData;
