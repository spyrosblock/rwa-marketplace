// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface IGnosisSafe {
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        uint8 operation
    ) external returns (bool success);
}

/**
 * @title SafeEscrow
 * @dev An escrow contract that works as a Gnosis Safe module
 */
contract SafeEscrow is ReentrancyGuard {
    using Address for address;

    // Gnosis Safe contract this escrow is attached to
    address public immutable safe;
    
    // Escrow states
    enum EscrowState { Created, Funded, Released, Refunded, Disputed }
    
    struct EscrowData {
        address seller;
        address buyer;
        address tokenAddress;
        uint256 tokenId;        // Used for NFTs
        uint256 amount;         // Used for ERC20s
        uint256 price;
        bool isNFT;
        EscrowState state;
        uint256 createdAt;
        uint256 deadline;
    }
    
    // Mapping from escrow ID to escrow data
    mapping(bytes32 => EscrowData) public escrows;
    
    // Events
    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed seller,
        address indexed buyer,
        address tokenAddress,
        uint256 amount,
        uint256 price,
        bool isNFT,
        uint256 deadline
    );
    event EscrowFunded(bytes32 indexed escrowId);
    event EscrowReleased(bytes32 indexed escrowId);
    event EscrowRefunded(bytes32 indexed escrowId);
    event EscrowDisputed(bytes32 indexed escrowId);
    
    constructor(address _safe) {
        require(_safe.isContract(), "Safe address must be a contract");
        safe = _safe;
    }
    
    /**
     * @dev Creates a new escrow
     */
    function createEscrow(
        address seller,
        address buyer,
        address tokenAddress,
        uint256 tokenIdOrAmount,
        uint256 price,
        bool isNFT,
        uint256 durationInDays
    ) external returns (bytes32) {
        require(seller != address(0) && buyer != address(0), "Invalid addresses");
        require(tokenAddress.isContract(), "Token must be a contract");
        require(price > 0, "Price must be greater than 0");
        require(durationInDays > 0, "Duration must be greater than 0");
        
        bytes32 escrowId = keccak256(
            abi.encodePacked(
                seller,
                buyer,
                tokenAddress,
                tokenIdOrAmount,
                price,
                isNFT,
                block.timestamp
            )
        );
        
        require(escrows[escrowId].createdAt == 0, "Escrow already exists");
        
        escrows[escrowId] = EscrowData({
            seller: seller,
            buyer: buyer,
            tokenAddress: tokenAddress,
            tokenId: isNFT ? tokenIdOrAmount : 0,
            amount: isNFT ? 0 : tokenIdOrAmount,
            price: price,
            isNFT: isNFT,
            state: EscrowState.Created,
            createdAt: block.timestamp,
            deadline: block.timestamp + (durationInDays * 1 days)
        });
        
        emit EscrowCreated(
            escrowId,
            seller,
            buyer,
            tokenAddress,
            tokenIdOrAmount,
            price,
            isNFT,
            escrows[escrowId].deadline
        );
        
        return escrowId;
    }
    
    /**
     * @dev Funds an escrow with the seller's tokens
     */
    function fundEscrow(bytes32 escrowId) external nonReentrant {
        EscrowData storage escrow = escrows[escrowId];
        require(escrow.createdAt > 0, "Escrow does not exist");
        require(escrow.state == EscrowState.Created, "Invalid escrow state");
        require(escrow.seller == msg.sender, "Only seller can fund");
        
        if (escrow.isNFT) {
            IERC721(escrow.tokenAddress).transferFrom(
                msg.sender,
                address(this),
                escrow.tokenId
            );
        } else {
            IERC20(escrow.tokenAddress).transferFrom(
                msg.sender,
                address(this),
                escrow.amount
            );
        }
        
        escrow.state = EscrowState.Funded;
        emit EscrowFunded(escrowId);
    }
    
    /**
     * @dev Releases the escrow to the buyer (requires Safe multi-sig)
     */
    function releaseEscrow(bytes32 escrowId) external nonReentrant {
        EscrowData storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.Funded, "Invalid escrow state");
        
        // Transfer tokens to buyer through Safe
        bytes memory data;
        if (escrow.isNFT) {
            data = abi.encodeWithSelector(
                IERC721.transferFrom.selector,
                address(this),
                escrow.buyer,
                escrow.tokenId
            );
            IGnosisSafe(safe).execTransactionFromModule(
                escrow.tokenAddress,
                0,
                data,
                0
            );
        } else {
            data = abi.encodeWithSelector(
                IERC20.transfer.selector,
                escrow.buyer,
                escrow.amount
            );
            IGnosisSafe(safe).execTransactionFromModule(
                escrow.tokenAddress,
                0,
                data,
                0
            );
        }
        
        escrow.state = EscrowState.Released;
        emit EscrowReleased(escrowId);
    }
    
    /**
     * @dev Refunds the escrow to the seller (requires Safe multi-sig)
     */
    function refundEscrow(bytes32 escrowId) external nonReentrant {
        EscrowData storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.Funded, "Invalid escrow state");
        
        // Transfer tokens back to seller through Safe
        bytes memory data;
        if (escrow.isNFT) {
            data = abi.encodeWithSelector(
                IERC721.transferFrom.selector,
                address(this),
                escrow.seller,
                escrow.tokenId
            );
            IGnosisSafe(safe).execTransactionFromModule(
                escrow.tokenAddress,
                0,
                data,
                0
            );
        } else {
            data = abi.encodeWithSelector(
                IERC20.transfer.selector,
                escrow.seller,
                escrow.amount
            );
            IGnosisSafe(safe).execTransactionFromModule(
                escrow.tokenAddress,
                0,
                data,
                0
            );
        }
        
        escrow.state = EscrowState.Refunded;
        emit EscrowRefunded(escrowId);
    }
    
    /**
     * @dev Marks an escrow as disputed (can only be called by buyer or seller)
     */
    function disputeEscrow(bytes32 escrowId) external {
        EscrowData storage escrow = escrows[escrowId];
        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller,
            "Only buyer or seller can dispute"
        );
        require(escrow.state == EscrowState.Funded, "Invalid escrow state");
        
        escrow.state = EscrowState.Disputed;
        emit EscrowDisputed(escrowId);
    }
    
    /**
     * @dev Returns true if the escrow has expired
     */
    function isExpired(bytes32 escrowId) public view returns (bool) {
        return block.timestamp > escrows[escrowId].deadline;
    }
    
    /**
     * @dev Returns the current state of an escrow
     */
    function getEscrowState(bytes32 escrowId) external view returns (EscrowState) {
        return escrows[escrowId].state;
    }
}