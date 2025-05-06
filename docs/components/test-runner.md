# Test Runner Component

## User Experience Flow

The Test Runner is a core component of Project Philly that allows users to configure and execute test runs.

### Key User Interactions

1. **Configure Test Parameters**
   - Select target environment (Production, Staging, Development)
   - Set parallel execution count
   - Configure timeout settings
   - Choose retry policy

2. **Select Test Files**
   - Browse and select test files or modules
   - Filter tests by type, tags, or previous status
   - View test descriptions and dependencies

3. **Execute Tests**
   - Launch test execution with a single click
   - View real-time progress indicators
   - Cancel running tests if needed

4. **Monitor Results**
   - See test counts (running, passed, failed)
   - View real-time console output
   - Get notifications when tests complete

### User Flow Diagram

```
[Login] → [Dashboard] → [Test Runner] → Configure → Select Files → Execute → [Results Viewer]
```

---

## Technical Implementation Details

<details>
<summary><strong>🔍 Component Structure</strong></summary>

```
/src/components/TestRunner/
  ├── TestRunnerContainer.jsx    # Main container component
  ├── TestConfigForm.jsx         # Test configuration form
  ├── TestFileSelector.jsx       # File selection component
  ├── RunnerControls.jsx         # Start/stop buttons
  ├── TestProgress.jsx           # Progress indicators
  └── LiveConsole.jsx            # Real-time test output
```

**Key Component: TestRunnerContainer.jsx**

```jsx
import React, { useState } from 'react';
import TestConfigForm from './TestConfigForm';
import TestFileSelector from './TestFileSelector';
import RunnerControls from './RunnerControls';
import TestProgress from './TestProgress';
import LiveConsole from './LiveConsole';
import { startTestRun } from '../../api/runnerApi';
import { useTestSocket } from '../../hooks/useTestSocket';

const TestRunnerContainer = ({ projectId }) => {
  const [config, setConfig] = useState({
    environment: 'staging',
    parallelExecutions: 2,
    timeout: 30,
    retryPolicy: 'once'
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [runId, setRunId] = useState(null);
  
  // Connect to WebSocket for real-time updates when runId changes
  const { status, progress, logs } = useTestSocket(runId);
  
  const handleStartRun = async () => {
    try {
      const newRunId = await startTestRun(projectId, config, selectedFiles);
      setRunId(newRunId);
    } catch (err) {
      console.error("Failed to start test run:", err);
    }
  };
  
  const handleStopRun = async () => {
    if (runId) {
      await stopTestRun(runId);
    }
  };
  
  return (
    <div className="test-runner-container">
      <h1>Test Runner</h1>
      <TestConfigForm config={config} onChange={setConfig} />
      <TestFileSelector 
        projectId={projectId} 
        selectedFiles={selectedFiles}
        onSelectionChange={setSelectedFiles} 
      />
      <RunnerControls 
        onStart={handleStartRun} 
        onStop={handleStopRun}
        isRunning={status === 'running'} 
        disabled={selectedFiles.length === 0} 
      />
      {runId && (
        <>
          <TestProgress status={status} progress={progress} />
          <LiveConsole logs={logs} />
        </>
      )}
    </div>
  );
};

export default TestRunnerContainer;
```
</details>

<details>
<summary><strong>🌐 API Endpoints</strong></summary>

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| `/api/projects/{id}/files` | GET | List available test files | `{ projectId }` | `{ files: [{ id, name, path, type }] }` |
| `/api/runner/start` | POST | Start a test run | `{ projectId, config, files }` | `{ runId, status }` |
| `/api/runner/{id}/stop` | POST | Stop a test run | `{ runId }` | `{ success, message }` |
| `/ws/runner/{id}` | WebSocket | Real-time test updates | Connection with runId | Stream of status events |

**Example API Call**

```javascript
// src/api/runnerApi.js
export const startTestRun = async (projectId, config, files) => {
  const response = await fetch('/api/runner/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({
      projectId,
      config,
      files: files.map(f => f.id)
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to start test run: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.runId;
};
```
</details>

<details>
<summary><strong>🔄 WebSocket Integration</strong></summary>

```javascript
// src/hooks/useTestSocket.js
import { useState, useEffect } from 'react';

export const useTestSocket = (runId) => {
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    if (!runId) return;
    
    const socket = new WebSocket(`ws://${window.location.host}/ws/runner/${runId}`);
    
    socket.onopen = () => {
      console.log(`WebSocket connected for run ${runId}`);
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'status':
          setStatus(data.status);
          break;
        case 'progress':
          setProgress(data.progress);
          break;
        case 'log':
          setLogs(logs => [...logs, data.message]);
          break;
        default:
          console.log('Unknown message type:', data);
      }
    };
    
    socket.onclose = () => {
      console.log(`WebSocket closed for run ${runId}`);
    };
    
    return () => {
      socket.close();
    };
  }, [runId]);
  
  return { status, progress, logs };
};
```
</details>

<details>
<summary><strong>⚙️ Backend Implementation</strong></summary>

The test runner backend handles the actual test execution:

```javascript
// server/services/testRunner.js
const { spawn } = require('child_process');
const WebSocket = require('ws');
const db = require('../db');

class TestRunner {
  constructor() {
    this.activeRuns = new Map();
    this.subscribers = new Map();
  }
  
  async startRun(projectId, config, files) {
    // Create record in database
    const runId = await db.testRuns.create({
      projectId,
      config,
      files,
      status: 'queued',
      startTime: new Date()
    });
    
    // Start test process
    const process = spawn('node', [
      './test-executor.js',
      '--runId', runId,
      '--projectId', projectId,
      '--env', config.environment,
      '--parallel', config.parallelExecutions,
      '--timeout', config.timeout,
      '--retry', config.retryPolicy
    ]);
    
    // Store process reference
    this.activeRuns.set(runId, {
      process,
      status: 'running',
      startTime: new Date(),
      results: {
        completed: 0,
        total: files.length,
        passing: 0,
        failing: 0
      }
    });
    
    // Set up process handlers
    this._setupProcessHandlers(runId, process);
    
    return runId;
  }
  
  _setupProcessHandlers(runId, process) {
    process.stdout.on('data', (data) => {
      try {
        const message = data.toString().trim();
        const parsedData = JSON.parse(message);
        this._updateRunState(runId, parsedData);
        this._notifySubscribers(runId, {
          type: parsedData.type,
          ...parsedData
        });
      } catch (err) {
        // Handle non-JSON output
        this._notifySubscribers(runId, {
          type: 'log',
          message: data.toString()
        });
      }
    });
    
    process.on('exit', async (code) => {
      const status = code === 0 ? 'completed' : 'failed';
      await db.testRuns.update(runId, { 
        status,
        endTime: new Date()
      });
      
      this._notifySubscribers(runId, {
        type: 'status',
        status
      });
      
      this.activeRuns.delete(runId);
    });
  }
  
  stopRun(runId) {
    const run = this.activeRuns.get(runId);
    if (run && run.process) {
      run.process.kill();
      return true;
    }
    return false;
  }
  
  subscribeToRun(runId, client) {
    if (!this.subscribers.has(runId)) {
      this.subscribers.set(runId, new Set());
    }
    this.subscribers.get(runId).add(client);
    
    // Send initial state
    const run = this.activeRuns.get(runId);
    if (run) {
      client.send(JSON.stringify({
        type: 'status',
        status: run.status
      }));
      
      client.send(JSON.stringify({
        type: 'progress',
        progress: run.results
      }));
    }
  }
  
  unsubscribeFromRun(runId, client) {
    if (this.subscribers.has(runId)) {
      this.subscribers.get(runId).delete(client);
    }
  }
  
  _notifySubscribers(runId, data) {
    const subscribers = this.subscribers.get(runId);
    if (subscribers) {
      const message = JSON.stringify(data);
      subscribers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }
  
  _updateRunState(runId, data) {
    const run = this.activeRuns.get(runId);
    if (!run) return;
    
    if (data.type === 'status') {
      run.status = data.status;
    } else if (data.type === 'progress') {
      run.results = data.progress;
    }
  }
}

module.exports = new TestRunner();
```
</details>

<details>
<summary><strong>💾 Data Models</strong></summary>

```typescript
// Types for test runner

interface TestConfig {
  environment: 'development' | 'staging' | 'production';
  parallelExecutions: number;
  timeout: number;  // in seconds
  retryPolicy: 'none' | 'once' | 'twice' | 'custom';
  customRetryCount?: number;
}

interface TestFile {
  id: string;
  name: string;
  path: string;
  type: 'unit' | 'integration' | 'e2e';
  tags?: string[];
  lastRun?: {
    status: TestStatus;
    timestamp: Date;
  };
}

interface TestRun {
  id: string;
  projectId: string;
  config: TestConfig;
  files: string[];  // File IDs
  status: TestStatus;
  startTime: Date;
  endTime?: Date;
  results?: TestResults;
}

type TestStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';

interface TestResults {
  completed: number;
  total: number;
  passing: number;
  failing: number;
  skipped?: number;
  duration?: number;  // in milliseconds
}

interface TestEvent {
  type: 'status' | 'progress' | 'log';
  runId: string;
  timestamp: Date;
  // Additional properties based on type
}
```
</details>

<details>
<summary><strong>🔍 Integration with Redux Store</strong></summary>

```javascript
// src/store/testRunnerSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { startTestRun, stopTestRun, fetchTestFiles } from '../api/runnerApi';

export const getTestFiles = createAsyncThunk(
  'testRunner/getTestFiles',
  async (projectId) => {
    return await fetchTestFiles(projectId);
  }
);

export const startRun = createAsyncThunk(
  'testRunner/startRun',
  async ({ projectId, config, files }) => {
    return await startTestRun(projectId, config, files);
  }
);

export const stopRun = createAsyncThunk(
  'testRunner/stopRun',
  async (runId) => {
    return await stopTestRun(runId);
  }
);

const testRunnerSlice = createSlice({
  name: 'testRunner',
  initialState: {
    availableFiles: [],
    selectedFiles: [],
    config: {
      environment: 'staging',
      parallelExecutions: 2,
      timeout: 30,
      retryPolicy: 'once'
    },
    currentRun: null,
    status: 'idle',
    progress: {
      completed: 0,
      total: 0,
      passing: 0,
      failing: 0
    },
    logs: [],
    loadingFiles: false,
    error: null
  },
  reducers: {
    selectFiles: (state, action) => {
      state.selectedFiles = action.payload;
    },
    updateConfig: (state, action) => {
      state.config = { ...state.config, ...action.payload };
    },
    updateRunStatus: (state, action) => {
      state.status = action.payload;
    },
    updateProgress: (state, action) => {
      state.progress = action.payload;
    },
    addLog: (state, action) => {
      state.logs.push(action.payload);
    },
    clearLogs: (state) => {
      state.logs = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle getTestFiles
      .addCase(getTestFiles.pending, (state) => {
        state.loadingFiles = true;
      })
      .addCase(getTestFiles.fulfilled, (state, action) => {
        state.availableFiles = action.payload;
        state.loadingFiles = false;
      })
      .addCase(getTestFiles.rejected, (state, action) => {
        state.error = action.error.message;
        state.loadingFiles = false;
      })
      // Handle startRun
      .addCase(startRun.pending, (state) => {
        state.status = 'starting';
        state.logs = [];
      })
      .addCase(startRun.fulfilled, (state, action) => {
        state.currentRun = action.payload;
        state.status = 'running';
      })
      .addCase(startRun.rejected, (state, action) => {
        state.error = action.error.message;
        state.status = 'idle';
      })
      // Handle stopRun
      .addCase(stopRun.fulfilled, (state) => {
        state.status = 'canceled';
      });
  }
});

export const { 
  selectFiles, 
  updateConfig, 
  updateRunStatus, 
  updateProgress, 
  addLog, 
  clearLogs 
} = testRunnerSlice.actions;

export default testRunnerSlice.reducer;
```
</details>

---

## Usage Examples

### Starting a Test Run

```javascript
// In a component
import { useDispatch, useSelector } from 'react-redux';
import { startRun, selectFiles, updateConfig } from '../store/testRunnerSlice';

const TestConfigComponent = ({ projectId }) => {
  const dispatch = useDispatch();
  const { config, selectedFiles } = useSelector(state => state.testRunner);
  
  const handleEnvironmentChange = (env) => {
    dispatch(updateConfig({ environment: env }));
  };
  
  const handleFileSelect = (files) => {
    dispatch(selectFiles(files));
  };
  
  const handleStartRun = () => {
    dispatch(startRun({
      projectId,
      config,
      files: selectedFiles
    }));
  };
  
  return (
    <div>
      {/* Configuration UI components */}
      <button onClick={handleStartRun}>Start Tests</button>
    </div>
  );
};
```

### Handling WebSocket Events

To handle WebSocket events in your React component:

```javascript
// In your component that uses the WebSocket
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateRunStatus, updateProgress, addLog } from '../store/testRunnerSlice';

const TestProgressComponent = ({ runId }) => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    if (!runId) return;
    
    const socket = new WebSocket(`ws://${window.location.host}/ws/runner/${runId}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'status':
          dispatch(updateRunStatus(data.status));
          break;
        case 'progress':
          dispatch(updateProgress(data.progress));
          break;
        case 'log':
          dispatch(addLog(data.message));
          break;
      }
    };
    
    return () => socket.close();
  }, [runId, dispatch]);
  
  // Render progress UI
};
```