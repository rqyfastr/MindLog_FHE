# MindLog_FHE: A Privacy-Preserving Mental Health Log

MindLog_FHE is an innovative mental health logging application that utilizes Zama's Fully Homomorphic Encryption (FHE) technology to ensure your emotional data remains confidential. With MindLog_FHE, you can track your feelings and receive AI-driven insights without ever compromising your privacy.

## The Problem

In today's digital age, mental health is often discussed openly, but the personal nature of mental health data poses significant privacy risks. Users may hesitate to record their thoughts or emotions due to fear of exposure, leading to a lack of understanding and management of their mental wellness. Cleartext data storage and processing can lead to unauthorized access, data breaches, and unwanted exposure of sensitive information. Hence, there exists a pressing need for a solution that allows users to securely document their mental health journey without fear.

## The Zama FHE Solution

MindLog_FHE addresses the privacy concerns surrounding mental health logging through the implementation of Fully Homomorphic Encryption. Utilizing Zama's FHE technology, MindLog_FHE allows users to perform computations on encrypted data. This means that even as your mental health data is processed by advanced AI algorithms to analyze trends and provide suggestions, it remains encrypted at all times. Specifically, we leverage the power of Zama's libraries to ensure that only the intended user has access to their decrypted data, while still allowing meaningful analysis by our AI systems.

## Key Features

- 🔒 **Complete Privacy**: Your emotional entries are encrypted, ensuring confidentiality at all stages.
- 🤖 **AI-Driven Insights**: AI algorithms analyze trends in your feelings without ever accessing your cleartext data.
- 🗓️ **Calendar View**: Visualize your emotional journey with an intuitive calendar layout, making it easier to track patterns over time.
- 📈 **Trend Analysis**: Receive actionable suggestions based on the analysis of your historical emotional data.
- 🌟 **User-Friendly Interface**: The app is designed to be warm and healing, fostering a supportive environment for mental health tracking.

## Technical Architecture & Stack

MindLog_FHE's architecture is built around the following core technologies:

- **Frontend**: React.js for a dynamic user experience.
- **Backend**: Node.js and Express.js for server management.
- **Database**: A secure storage system capable of holding encrypted data.
- **Core Privacy Engine**: Zama’s Fully Homomorphic Encryption (FHE) using the libraries:
  - **fhevm** for encrypted computations.
  - **Concrete ML** for AI model training on encrypted inputs.

## Smart Contract / Core Logic

Below is a simplified code snippet demonstrating how encrypted emotion logs might be processed using Zama's technology:

```solidity
// Solidity snippet for recording emotional entries
pragma solidity ^0.8.0;

import "TFHE-rs";

// Function to add an encrypted emotional entry
function addEmotionalEntry(uint64 entry) public {
    uint64 encryptedEntry = TFHE.encrypt(entry);
    storeEncryptedEntry(encryptedEntry);
}

// Function to analyze trends on encrypted data
function analyzeTrends() public view returns (uint64) {
    uint64[] memory entries = getEncryptedEntries();
    return TFHE.decrypt(TFHE.analyze(entries));
}
```

This example illustrates how MindLog_FHE securely handles and processes emotional data while ensuring that the underlying information remains private.

## Directory Structure

The project follows a clear directory structure to facilitate development and navigation:

```
MindLog_FHE/
├── frontend/
│   ├── src/
│   ├── public/
├── backend/
│   ├── src/
│   ├── package.json
├── contracts/
│   ├── MindLog_FHE.sol
└── README.md
```

In the directory structure, we have segregated the frontend and backend code, along with a dedicated folder for the smart contract, which is crucial for handling encrypted transactions.

## Installation & Setup

To get started with MindLog_FHE, follow these instructions:

### Prerequisites

- A development environment set up with Node.js and npm for the backend.
- A suitable environment for running React.js for the frontend.
- Python with pip for any machine learning components.

### Installation Steps

1. **Install necessary backend dependencies:**
   ```bash
   npm install express body-parser
   ```
2. **Install Zama's FHE library:**
   ```bash
   npm install fhevm
   ```
3. **Install necessary frontend dependencies:**
   ```bash
   npm install react react-dom
   ```
4. **Install Concrete ML for any AI modules:**
   ```bash
   pip install concrete-ml
   ```

## Build & Run

To build and run MindLog_FHE, execute the following commands in your terminal:

1. **For the backend:**
   ```bash
   npx express-server
   ```
2. **For the frontend:**
   ```bash
   npm start
   ```

3. **To compile the smart contracts:**
   ```bash
   npx hardhat compile
   ```

## Acknowledgements

MindLog_FHE extends its gratitude to Zama for providing the open-source Fully Homomorphic Encryption primitives that make this project viable. Their technology enables us to prioritize user privacy, creating a safe space for mental health management.

---

By following the instructions outlined in this document, you can set up and explore MindLog_FHE, a cutting-edge application designed to empower individuals to take control of their mental health journey, all while keeping their data secure and private.

