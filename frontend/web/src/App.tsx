import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from "react";
import { getContractReadOnly, getContractWithSigner } from "./components/useContract";
import "./App.css";
import { useAccount } from 'wagmi';
import { useFhevm, useEncrypt, useDecrypt } from '../fhevm-sdk/src';
import { ethers } from 'ethers';

interface MentalHealthLog {
  id: string;
  moodScore: number;
  date: string;
  description: string;
  publicValue1: number;
  publicValue2: number;
  creator: string;
  timestamp: number;
  isVerified?: boolean;
  decryptedValue?: number;
}

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  [logs, setLogs] = useState<MentalHealthLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingLog, setCreatingLog] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ 
    visible: false, 
    status: "pending" as const, 
    message: "" 
  });
  const [newLogData, setNewLogData] = useState({ moodScore: "", description: "", date: new Date().toISOString().split('T')[0] });
  const [selectedLog, setSelectedLog] = useState<MentalHealthLog | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMood, setFilterMood] = useState<number | null>(null);
  const [stats, setStats] = useState({ total: 0, avgMood: 0, verified: 0 });
  const [fhevmInitializing, setFhevmInitializing] = useState(false);

  const { status, initialize, isInitialized } = useFhevm();
  const { encrypt, isEncrypting} = useEncrypt();
  const { verifyDecryption, isDecrypting: fheIsDecrypting } = useDecrypt();

  useEffect(() => {
    const initFhevmAfterConnection = async () => {
      if (!isConnected) return;
      if (isInitialized || fhevmInitializing) return;
      
      try {
        setFhevmInitializing(true);
        await initialize();
      } catch (error) {
        setTransactionStatus({ 
          visible: true, 
          status: "error", 
          message: "FHEVM initialization failed" 
        });
        setTimeout(() => setTransactionStatus({ visible: false, status: "

pending", message: "" }), 3000);
      } finally {
 setFhevmInitializing(false);
      }
    };

    initFhevmAfterConnection();
  }, [is]);

  useEffect(() {
    const loadDataAndContract = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }
      
      try {
        await loadData();
        const contract = await getContractReadOnly();
        if (contract) await checkAvailability();
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDataAndContract();
  }, [isConnected]);

  const loadData = async () => {
    if (!isConnected) return;
    
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const businessIds = await contract.getAllBusinessIds();
      const logsList: MentalHealthLog[] = [];
      
      for (const businessId of businessIds) {
        try {
          const businessData = await contract.getBusinessData(businessId);
          logsList.push({
            id: businessId,
            moodScore: Number(businessData.publicValue1) || 0,
            date: new Date(Number(businessData.timestamp) * 1000).toISOString().split('T')[0],
            description: businessData.description,
            publicValue1: Number(business) || 0,
            publicValue2: Number(businessData.publicValue2) || 0,
            creator: businessData.creator,
            timestamp: Number(businessData.timestamp),
            isVerified: businessData.isVerified,
            decryptedValue: Number(businessData.decryptedValue) || 0
          });
        } catch (e) {
          console.error('Error loading business data:', e);
        }
      }
      
      setLogs(logsList);
      updateStats(logsList);
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Failed to load data" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setIsRefreshing(false); 
    }
  };

  const updateStats = (logsList: MentalHealthLog[]) => {
    const total = logsList.length;
    const verified = logsList.filter(log => log.isVerified).length;
    const avgMood = total > 0 ? logsList.reduce((sum, log) => sum + log.moodScore, 0) / total : 0;
    setStats({ total, avgMood, verified });
  };

  const checkAvailability = async () => {
    try {
      const contract = await getContractReadOnly();
      if (contract) {
        await contract.isAvailable();
        setTransactionStatus({ visible: true, status: "success", message: "FHE system available" });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
      }
    } catch (e) {
      console.error('Availability check failed:', e);
    }
  };

  const createLog = async () => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return; 
    }
    
    setCreatingLog(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Creating encrypted mental health log..." });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      const moodValue = parseInt(newLogData.moodScore) || 0;
      const businessId = `mindlog-${Date.now()}`;
      
      const encryptedResult = await encrypt(await contract.getAddress(), address, moodValue);
      
      const tx = await contract.createBusinessData(
        businessId,
        `Mood Log ${new Date().toLocaleDateString()}`,
        encryptedResult.encryptedData,
        encryptedResult.proof,
        moodValue,
        0,
        newLogData.description
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Waiting for transaction confirmation..." });
      await tx.wait();
      
      setTransactionStatus({ visible: true, status: true, message: "Mental health log created successfully!" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      await loadData();
      setShowCreateModal(false);
      setNewLogData({ moodScore: "", description: "", date: new Date().toISOString().split('T')[0] });
    } catch (e: any) {
      const errorMessage = e.message?.includes("user rejected transaction") 
        ? "Transaction rejected by user" 
        : "Submission failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setCreatingLog(false); 
    }
  };

  const decryptData = async (businessId: string): Promise<number | null> => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    }
    
    try {
      const contractRead = await getContractReadOnly();
      if (!contractRead) return null;
      
      const businessData = await contractRead.getBusinessData(businessId);
      if (businessData.isVerified) {
        const storedValue = Number(businessData.decryptedValue) || 0;
        
        setTransactionStatus({ 
          visible: true, 
          status: "success", 
          message: "Data already verified on-chain" 
        });
        setTimeout(() => {
          setTransactionStatus({ visible: false, status: "pending", message: "" });
        }, 2000);
        
        return storedValue;
      }
      
      const contractWrite = await getContractWithSigner();
      if (!contractWrite) return null;
      
      const encryptedValueHandle = await contractRead.getEncryptedValue(businessId);
      
      const result = await verifyDecryption(
        [encryptedValueHandle],
        await contractRead.getAddress(),
        (abiEncodedClearValues: string, decryptionProof: string) => 
          contractWrite.verifyDecryption(businessId, abiEncodedClearValues, decryptionProof)
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Verifying decryption on-chain..." });
      
      const clearValue = result.decryptionResult.clearValues[encryptedValueHandle];
      
      await loadData();
      
      setTransactionStatus({ visible: true, status: "success", message: "Mood data decrypted and verified!" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      return Number(clearValue);
      
    } catch (e: any) { 
      if (e.message?.includes("Data already verified")) {
        setTransactionStatus({ 
          visible: true, 
          status: "success", 
          message: "Data is already verified on-chain" 
        });
        setTimeout(() => {
          setTransactionStatus({ visible: false, status: "pending", message: "" });
        }, 2000);
        
        await loadData();
        return null;
      }
      
      setTransactionStatus({ 
        visible: true, 
        status: "error", 
        message: "Decryption failed: " + (e.message || "Unknown error") 
      });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.date.includes(searchTerm);
    const matchesMood = filterMood === null || log.moodScore === filterMood;
    return matchesSearch && matchesMood;
  });

  const getMoodEmoji = (score: number) => {
    if (score >= 9) return "😊";
    if (score >= 7) return "🙂";
    if (score >= 5) return "😐";
    if (score >= 3) return "😔";
    return "😢";
  };

  const renderStats = () => {
    return (
      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Logs</div>
          </div>
        </div>
        
        <div className="stat-card glass">
          <div className="stat-icon">😊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.avgMood.toFixed(1)}</div>
            <div className="stat-label">Avg Mood</div>
          </div>
        </div>
        
        <div className="stat-card glass">
          <div className="stat-icon">🔐</div>
          <div className="stat-content">
            <div className="stat-value">{stats.verified}</div>
            <div className="stat-label">Verified</div>
          </div>
        </div>
      </div>
    );
  };

  const renderMoodChart = () => {
    const moodData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    logs.forEach(log => {
      if (log.moodScore >= 1 && log.moodScore <= 10) {
        moodData[log.moodScore - 1]++;
      }
    });
    
    const maxCount = Math.max(...moodData);
    
    return (
      <div className="mood-chart glass">
        <h3>Mood Distribution</h3>
        <div className="chart-bars">
          {moodData.map((count, index) => (
            <div key={index} className="chart-bar-container">
              <div 
                className="chart-bar" 
                style={{ height: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%' }}
              >
                <span className="bar-count">{count}</span>
              </div>
              <span className="bar-label">{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="app-container">
        <header className="app-header glass">
          <div className="logo">
            <h1>🌅 MindLog FHE</h1>
            <p>Privacy-First Mental Health Journal</p>
          </div>
          <ConnectButton />
        </header>
        
        <div className="welcome-section">
          <div className="welcome-card glass">
            <div className="welcome-icon">🔐</div>
            <h2>Welcome to MindLog FHE</h2>
            <p>Your private mental health journal with fully homomorphic encryption</p>
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">💫</span>
                <span>Sunset gradient UI with glassmorphism</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✨</span>
                <span>Micro-interactions with hover effects</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🌅</span>
                <span>Card-based layout for easy navigation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized || fhevmInitializing) {
    return (
      <div className="loading-screen">
        <div className="sunset-loader"></div>
        <p>Initializing FHE Encryption System...</p>
      </div>
    );
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="sunset-loader"></div>
      <p>Loading your private mental health logs...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header glass">
        <div className="logo">
          <h1>🌅 MindLog FHE</h1>
          <p>Your encrypted mental health companion</p>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="create-btn glass"
          >
            + New Log
          </button>
          <ConnectButton />
        </div>
      </header>
      
      <main className="main-content">
        <div className="content-header">
          <h2>Your Mental Health Journey</h2>
          <div className="search-filters">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input glass"
            />
            <select 
              value={filterMood || ''} 
              onChange={(e) => setFilterMood(e.target.value ? parseInt(e.target.value) : null)}
              className="mood-filter glass"
            >
              <option value="">All Moods</option>
              {[1,2,3,4,5,6,7,8,9,10].map(score => (
                <option key={score} value={score}>{score} {getMoodEmoji(score)}</option>
              ))}
            </select>
            <button onClick={loadData} className="refresh-btn glass">
              🔄
            </button>
          </div>
        </div>

        {renderStats()}
        {renderMoodChart()}

        <div className="logs-section">
          <h3>Recent Logs ({filteredLogs.length})</h3>
          <div className="logs-grid">
            {filteredLogs.length === 0 ? (
              <div className="empty-state glass">
                <div className="empty-icon">📝</div>
                <p>No mental health logs found</p>
                <button 
                  className="create-btn glass" 
                  onClick={() => setShowCreateModal(true)}
                >
                    Create Your First Log
                </button>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div 
                  key={log.id}
                  className="log-card glass"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="log-header">
                    <span className="mood-display">
                      {getMoodEmoji(log.moodScore)} {log.moodScore}/10
                    </span>
                    <span className={`verification-badge ${log.isVerified ? 'verified' : 'pending'}`}>
                      {log.isVerified ? '🔐 Verified' : '🔓 Pending'}
                    </span>
                  </div>
                  <div className="log-date">{log.date}</div>
                  <p className="log-description">{log.description}</p>
                  <div className="log-footer">
                    <span className="log-creator">
                      {log.creator.substring(0, 6)}...{log.creator.substring(38)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {showCreateModal && (
        <CreateLogModal 
          onSubmit={createLog} 
          onClose={() => setShowCreateModal(false)} 
          creating={creatingLog} 
          logData={newLogData} 
          setLogData={setNewLogData}
          isEncrypting={isEncrypting}
        />
      )}

      {selectedLog && (
        <LogDetailModal 
          log={selectedLog} 
          onClose={() => setSelectedLog(null)} 
          decryptData={() => decryptData(selectedLog.id)}
          isDecrypting={fheIsDecrypting}
        />
      )}

      {transactionStatus.visible && (
        <div className={`transaction-toast ${transactionStatus.status}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {transactionStatus.status === "pending" && "⏳"}
              {transactionStatus.status === "success" && "✅"}
              {transactionStatus.status === "error" && "❌"}
            </span>
            {transactionStatus.message}
          </div>
        </div>
      )}
    </div>
  );
};

const CreateLogModal: React.FC<{
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  logData: any;
  setLogData: (data: any) => void;
  isEncrypting: boolean;
}> = ({ onSubmit, onClose, creating, logData, setLogData, isEncrypting }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'moodScore') {
      const intValue = value.replace(/[^\d]/g, '');
      const score = Math.min(10, Math.max(1, parseInt(intValue) || 1));
      setLogData({ ...logData, [name]: score.toString() });
    } else {
      setLogData({ ...logData, [name]: value });
    }
  };

  const getMoodColor = (score: number) => {
    const hue = (score - 1) * 12;
    return `hsl(${hue}, 70%, 60%)`;
  };

  return (
    <div className="modal-overlay">
      <div className="create-modal glass">
        <div className="modal-header">
          <h2>New Mental Health Log</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice">
            <strong>🔐 FHE Protected</strong>
            <p>Your mood score will be encrypted with Zama FHE technology</p>
          </div>
          
          <div className="form-group">
            <label>Mood Score (1-10) *</label>
            <div className="mood-slider-container">
              <input 
                type="range"
                min="1"
                max="10"
                name="moodScore"
                value={logData.moodScore || 5}
                onChange={handleChange}
                className="mood-slider"
                style={{ '--mood-color': getMoodColor(parseInt(logData.moodScore) || 5) } as any}
              />
              <div className="mood-labels">
                <span>1 😢</span>
                <span>5 😐</span>
                <span>10 😊</span>
              </div>
              <div className="selected-mood">
                Current: {logData.moodScore || 5} {logData.moodScore ? 
                  ['😢','😔','😞','😕','😐','🙂','😊','😄','😁','😊'][parseInt(logData.moodScore)-1] : '😐'}
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label>Date</label>
            <input 
              type="date"
              name="date"
              value={logData.date}
              onChange={handleChange}
              className="glass"
            />
          </div>
          
          <div className="form-group">
            <label>How are you feeling today? *</label>
            <textarea 
              name="description"
              value={logData.description}
              onChange={handleChange}
              placeholder="Describe your thoughts and feelings..."
              rows={4}
              className="glass"
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-btn glass">Cancel</button>
          <button 
            onClick={onSubmit} 
            disabled={creating || isEncrypting || !logData.description}
            className="submit-btn glass"
          >
            {creating || isEncrypting ? "🔐 Encrypting..." : "Create Log"}
          </button>
        </div>
      </div>
    </div>
  );
};

const LogDetailModal: React.FC<{
  log: MentalHealthLog;
  onClose: () => void;
  decryptData: () => Promise<number | null>;
  isDecrypting: boolean;
}> = ({ log, onClose, decryptData, isDecrypting }) => {
  const [decryptedValue, setDecryptedValue] = useState<number | null>(null);

  const handleDecrypt = async () => {
    if (log.isVerified) return;
    const value = await decryptData();
    setDecryptedValue(value);
  };

  const getMoodColor = (score: number) => {
    const hue = (score - 1) * 12;
    return `hsl(${hue}, 70%, 60%)`;
  };

  return (
    <div className="modal-overlay">
      <div className="detail-modal glass">
        <div className="modal-header">
          <h2>Mental Health Log Details</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div className="modal-body">
          <div className="log-meta">
            <div className="mood-display-large" style={{ 
              backgroundColor: getMoodColor(log.moodScore),
              color: 'white'
            }}>
              <span className="mood-emoji">
                {log.moodScore >= 9 ? "😊" : 
                 log.moodScore >= 7 ? "🙂" : 
                 log.moodScore >= 5 ? "😐" : 
                 log.moodScore >= 3 ? "😔" : "😢"}
              </span>
              <span className="mood-score">{log.moodScore}/10</span>
            </div>
            <div className="meta-info">
              <div className="meta-item">
                <span>Date:</span>
                <strong>{log.date}</strong>
              </div>
              <div className="meta-item">
                <span>Creator:</span>
                <strong>{log.creator.substring(0, 8)}...{log.creator.substring(36)}</strong>
              </div>
              <div className="meta-item">
                <span>Status:</span>
                <strong className={log.isVerified ? 'verified' : 'pending'}>
                  {log.isVerified ? '🔐 On-chain Verified' : '🔓 Encrypted'}
                </strong>
              </div>
            </div>
          </div>

          <div className="log-content">
            <h4>Today's Reflection</h4>
            <p>{log.description}</p>
          </div>

          <div className="encryption-section">
            <h4>FHE Protection</h4>
            <div className="encryption-status">
              {log.isVerified ? (
                <div className="verified-status">
                  <span className="status-icon">✅</span>
                  <span>Mood data verified on-chain: {log.decryptedValue}</span>
                </div>
              ) : decryptedValue ? (
                <div className="decrypted-status">
                  <span className="status-icon">🔓</span>
                  <span>Locally decrypted: {decryptedValue}</span>
                </div>
              ) : (
                <div className="encrypted-status">
                  <span className="status-icon">🔐</span>
                  <span>Mood score encrypted with FHE</span>
                </div>
              )}
            </div>
            
            {!log.isVerified && (
              <button 
                onClick={handleDecrypt}
                disabled={isDecrypting}
                className="decrypt-btn glass"
              >
                {isDecrypting ? "Decrypting..." : "Verify on-chain"}
              </button>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="close-btn glass">Close</button>
        </div>
      </div>
    </div>
  );
};

export default App;

