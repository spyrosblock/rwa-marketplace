# L£GT - Legally Empowered Governance Tokens

<p align="center">
  <img src="https://docs.legt.co" alt="L£GT Logo" />
</p>

> An open & permissionless RWA (Real World Assets) protocol that securely attaches legal contracts to NFT and ERC20 tokens, enabling digital meets physical.

## 📖 Overview

L£GT (Legally Empowered Governance Tokens) is a decentralized marketplace protocol built on Ethereum that bridges the gap between digital tokens and real-world assets. It enables users to tokenize real-world assets with legally binding contracts, handle jurisdictional compliance, resolve on-chain disputes, and achieve instant RWA liquidity.

This project is built on [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2) - a minimal and forkable repo providing builders with a starter kit to build decentralized applications on Ethereum.

## 🏗 Architecture

This is a monorepo using Yarn workspaces containing two main packages:

```
rwa-marketplace/
├── packages/
│   ├── hardhat/          # Solidity smart contracts
│   │   ├── contracts/     # Smart contracts
│   │   ├── deploy/       # Deployment scripts
│   │   ├── test/         # Contract tests
│   │   └── hardhat.config.ts
│   └── nextjs/           # Next.js frontend
│       ├── app/          # Next.js App Router pages
│       ├── components/   # React components
│       ├── hooks/       # Custom React hooks
│       ├── services/    # Web3 & IPFS services
│       └── utils/       # Utility functions
```

##  Smart Contracts

### Core Contracts

| Contract | Description |
|----------|-------------|
| `NFTFactory` | Factory for creating NFTs that can represent real-world assets |
| `NFTFactoryKyc` | NFT Factory with KYC (Know Your Customer) compliance |
| `ERC20Factory` | Factory for creating ERC20 governance tokens |
| `ERC20FactoryKyc` | ERC20 Factory with KYC compliance |
| `ERC20Ownable` | ERC20 token with ownership and pause capabilities |
| `ERC20OwnableKyc` | ERC20 with KYC and additional compliance features |
| `TokenSale` | Marketplace for buying/selling tokens with dynamic pricing |
| `Escrow` | Secure escrow for handling token transactions |
| `Disperse` | Utility for dispersing tokens to multiple addresses |

### Key Features

- **KYC Integration**: Support for compliant token creation with KYC checks
- **Legal Attachments**: Attach legal contracts to NFTs and ERC20 tokens
- **Dynamic Pricing**: Flexible pricing mechanisms for token sales
- **Escrow System**: Secure transaction handling
- **Pause/Unpause**: Emergency controls for token transfers
- **Lock/Unlock**: Ability to lock tokens for compliance

## 🛠 Tech Stack

### Smart Contracts
- **Solidity** 0.8.19
- **Hardhat** - Ethereum development environment
- **OpenZeppelin** - Secure smart contract libraries
- **TypeChain** - TypeScript bindings for contracts

### Frontend
- **Next.js** 14 - React framework
- **React** 18 - UI library
- **Wagmi** - React hooks for Ethereum
- **RainbowKit** - Wallet connection UI
- **Tailwind CSS** - Utility-first CSS
- **Chakra UI** - Component library
- **TypeScript** - Type safety

### Infrastructure
- **IPFS** - Decentralized storage for metadata
- **Alchemy** - RPC provider
- **Etherscan** - Contract verification

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.17.0
- Yarn 3.2.3+ (configured as package manager)

### Installation

```bash
# Clone the repository
git clone https://github.com/spyrosblock/rwa-marketplace.git
cd rwa-marketplace

# Install dependencies
yarn install
```

### Environment Setup

1. Copy the example environment files:

```bash
cp packages/hardhat/.env.example packages/hardhat/.env
cp packages/nextjs/.env.example packages/nextjs/.env
```

2. Configure your environment variables in `.env`:

**Hardhat (.env):**
```
ALCHEMY_API_KEY=your_alchemy_api_key
DEPLOYER_PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
KINTO_DEPLOYER_PRIVATE_KEY=your_kinto_private_key  # for Kinto network
```

**Nextjs (.env):**
```
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_id
```

### Running Local Development

```bash
# Start the local blockchain
yarn chain

# In a new terminal, deploy contracts to localhost
yarn deploy

# Start the Next.js development server
yarn start
```

The application will be available at `http://localhost:3000`.

### Building for Production

```bash
# Build the Next.js application
yarn next:build

# Serve the production build
yarn next:serve
```

## 📝 Available Scripts

### Root Scripts
```bash
yarn start              # Start Next.js dev server
yarn build              # Build for production
yarn test               # Run tests
yarn chain              # Start local Hardhat node
yarn deploy             # Deploy contracts
yarn verify             # Verify contracts on Etherscan
yarn format             # Format code (Prettier)
yarn lint               # Lint code (ESLint)
```

### Hardhat Scripts
```bash
yarn hardhat:compile    # Compile contracts
yarn hardhat:test       # Run contract tests
yarn hardhat:clean      # Clean and redeploy
yarn hardhat:account   # List available accounts
```

### Next.js Scripts
```bash
yarn next:build         # Build Next.js app
yarn next:serve        # Serve production build
yarn next:check-types  # TypeScript type checking
```

## 🌐 Supported Networks

The project is configured to work with multiple networks:

| Network | Chain ID | Type |
|---------|----------|------|
| Kinto | 7887 | Mainnet |
| Base Sepolia | 84532 | Testnet |
| Sepolia | 11155111 | Testnet |
| Arbitrum | 42161 | Mainnet |
| Arbitrum Sepolia | 421614 | Testnet |
| Optimism | 10 | Mainnet |
| Optimism Sepolia | 11155420 | Testnet |
| Polygon | 137 | Mainnet |
| Polygon zkEVM | 1101 | Mainnet |
| Gnosis | 100 | Mainnet |
| Base | 8453 | Mainnet |
| Scroll | 534352 | Mainnet |
| PGN | 424 | Mainnet |

## 📄 Deployment

### Deploying to Base Sepolia

```bash
yarn hardhat deploy --network baseSepolia
```

### Deploying to Kinto

```bash
yarn hardhat deploy --network kinto
```

After deployment, update the `deployedContracts.ts` file or run the automatic generation:

```bash
yarn hardhat generate
```

## 🔧 Development

### Code Formatting

```bash
yarn format
```

### Linting

```bash
yarn lint
```

### Running Tests

```bash
# Run Hardhat tests
yarn hardhat:test

# Or from root
yarn test
```

## 📁 Project Structure

### Frontend Pages (`packages/nextjs/app/`)

- `/` - Home page - L£GT introduction
- `/create` - Mint new RWA tokens
- `/dashboard` - User dashboard
- `/marketplace` - Browse marketplace
- `/nft` - NFT management
- `/kyc` - KYC compliance
- `/dirtdao` - DAO governance
- `/blockexplorer` - Transaction explorer
- `/debug` - Debug tools

### Smart Contract Structure

```
contracts/
├── ERC20Factory.sol          # ERC20 token factory
├── ERC20FactoryKyc.sol       # ERC20 factory with KYC
├── ERC20Ownable.sol          # Ownable ERC20 implementation
├── ERC20OwnableKyc.sol      # Ownable ERC20 with KYC
├── NFTFactory.sol            # NFT factory
├── NFTFactoryKyc.sol         # NFT factory with KYC
├── TokenSale.sol             # Token sale marketplace
├── Escrow.sol                # Escrow contract
├── Disperse.sol              # Token distribution
├── YourContract.sol         # Template contract
└── interfaces/               # Interface definitions
    └── ICupOfDirt.sol
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on how to contribute.

## license

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](https://docs.legt.co)
- [Discord](https://discord.gg/BKSRV5fFRH)
- [GitHub](https://github.com/spyrosblock/rwa-marketplace)

## 🙏 Acknowledgments

Built with [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2) - the fastest way to build Ethereum dApps.

---

<p align="center">
  Where <strong>digital</strong> meets <strong>physical</strong>
</p>
