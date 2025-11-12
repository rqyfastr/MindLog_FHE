pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract MindLog_FHE is ZamaEthereumConfig {
    struct JournalEntry {
        string entryId;
        euint32 encryptedMood;
        uint256 publicTimestamp;
        string encryptedContent;
        address owner;
        uint256 creationDate;
        uint32 decryptedMood;
        bool isAnalyzed;
    }

    mapping(string => JournalEntry) public journalEntries;
    mapping(address => string[]) public userEntries;

    event EntryCreated(string indexed entryId, address indexed owner);
    event AnalysisCompleted(string indexed entryId, uint32 decryptedMood);

    constructor() ZamaEthereumConfig() {
    }

    function createEntry(
        string calldata entryId,
        externalEuint32 encryptedMood,
        bytes calldata moodProof,
        string calldata encryptedContent,
        uint256 publicTimestamp
    ) external {
        require(bytes(journalEntries[entryId].entryId).length == 0, "Entry already exists");
        require(FHE.isInitialized(FHE.fromExternal(encryptedMood, moodProof)), "Invalid encrypted mood");

        journalEntries[entryId] = JournalEntry({
            entryId: entryId,
            encryptedMood: FHE.fromExternal(encryptedMood, moodProof),
            publicTimestamp: publicTimestamp,
            encryptedContent: encryptedContent,
            owner: msg.sender,
            creationDate: block.timestamp,
            decryptedMood: 0,
            isAnalyzed: false
        });

        FHE.allowThis(journalEntries[entryId].encryptedMood);
        FHE.makePubliclyDecryptable(journalEntries[entryId].encryptedMood);

        userEntries[msg.sender].push(entryId);
        emit EntryCreated(entryId, msg.sender);
    }

    function analyzeMood(
        string calldata entryId,
        bytes memory abiEncodedClearMood,
        bytes memory decryptionProof
    ) external {
        require(bytes(journalEntries[entryId].entryId).length > 0, "Entry does not exist");
        require(!journalEntries[entryId].isAnalyzed, "Mood already analyzed");

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(journalEntries[entryId].encryptedMood);

        FHE.checkSignatures(cts, abiEncodedClearMood, decryptionProof);

        uint32 decodedMood = abi.decode(abiEncodedClearMood, (uint32));
        journalEntries[entryId].decryptedMood = decodedMood;
        journalEntries[entryId].isAnalyzed = true;

        emit AnalysisCompleted(entryId, decodedMood);
    }

    function getEncryptedMood(string calldata entryId) external view returns (euint32) {
        require(bytes(journalEntries[entryId].entryId).length > 0, "Entry does not exist");
        return journalEntries[entryId].encryptedMood;
    }

    function getEntryDetails(string calldata entryId) external view returns (
        string memory entryIdValue,
        uint256 publicTimestamp,
        string memory encryptedContent,
        address owner,
        uint256 creationDate,
        bool isAnalyzed,
        uint32 decryptedMood
    ) {
        require(bytes(journalEntries[entryId].entryId).length > 0, "Entry does not exist");
        JournalEntry storage entry = journalEntries[entryId];

        return (
            entry.entryId,
            entry.publicTimestamp,
            entry.encryptedContent,
            entry.owner,
            entry.creationDate,
            entry.isAnalyzed,
            entry.decryptedMood
        );
    }

    function getUserEntries(address user) external view returns (string[] memory) {
        return userEntries[user];
    }

    function isAvailable() public pure returns (bool) {
        return true;
    }
}

