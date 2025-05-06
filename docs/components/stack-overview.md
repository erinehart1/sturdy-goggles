# Project Philly: Connecting UX Flows to Technical Implementation

## Interactive Documentation System

This documentation system connects user-facing workflows to their technical implementations, allowing developers to understand both the user experience and the underlying code.

---

## Dashboard Component

### User View
![Dashboard UX](placeholder)

**User Experience Flow:**
1. User logs in and sees test history
2. User can filter by test status, date, and project
3. User can select a test to view details
4. User can trigger a new test run

### Technical Implementation

<details>
<summary><strong>🔍 Component Architecture</strong></summary>

```jsx
// DashboardContainer.jsx
import React, { useEffect, useState } from 'react';
import TestHistoryTable from './TestHistoryTable';
import FilterPanel from './FilterPanel';
import { fetchTestHistory } from '../api/testApi';
import { useAuth } from '../context/AuthContext';

const DashboardContainer = () => {
  const [tests, setTests] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'week',
    project: 'all'
  });
  const { user } = useAuth();
  
  useEffect(() => {
    const loadTests = async () => {
      const testData = await fetchTestHistory(user.id, filters);
      setTests(testData);
    };
    
    loadTests();
  }, [filters, user.id]);
  
  return (
    <div className="dashboard-container">
      <h1>Test Dashboard</h1>
      <FilterPanel filters={filters} setFilters={setFilters} />
      <TestHistoryTable tests={tests} />
    </div>
  );
};

export default DashboardContainer;
```
</details>

<details>
<summary><strong>🌐 API Endpoints</strong></summary>

| Endpoint | Method | Description | Request Parameters | Response |
|----------|--------|-------------|-------------------|----------|
| `/api/tests` | GET | Fetches test history | `userId`, `status`, `dateRange`, `project` | Array of test objects |
| `/api/tests/{id}` | GET | Fetches single test details | `id` | Test object with full details |
| `/api/tests` | POST | Creates a new test run | `projectId`, `testConfig` | Created test object |

```javascript
// testApi.js
export const fetchTestHistory = async (userId, filters) => {
  const queryParams = new URLSearchParams({
    userId,
    status: filters.status,
    dateRange: filters.dateRange,
    project: filters.project
  });
  
  const response = await fetch(`/api/tests?${queryParams}`);
  return response.json();
};
```
</details>

<details>
<summary><strong>💾 Data Models</strong></summary>

```typescript
// models/Test.ts
interface Test {
  id: string;
  projectId: string;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  results?: TestResults;
  userId: string;
  config: TestConfig;
}

interface TestConfig {
  targetEnvironment: string;
  parallelExecutions: number;
  timeout: number;
  retryPolicy: RetryPolicy;
}

interface TestResults {
  passCount: number;
  failCount: number;
  skippedCount: number;
  duration: number;
  errorLogs: ErrorLog[];
}
```
</details>

<details>
<summary><strong>🔄 State Management</strong></summary>

```javascript
// store/testSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchTestHistory, fetchTestById } from '../api/testApi';

export const getTestHistory = createAsyncThunk(
  'tests/getHistory',
  async ({userId, filters}) => {
    return await fetchTestHistory(userId, filters);
  }
);

const testSlice = createSlice({
  name: 'tests',
  initialState: {
    tests: [],
    selectedTest: null,
    loading: false,
    error: null
  },
  reducers: {
    // Reducers here
  },
  extraReducers: (builder) => {
    builder
      .addCase(getTestHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(getTestHistory.fulfilled, (state, action) => {
        state.tests = action.payload;
        state.loading = false;
      })
      .addCase(getTestHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export default testSlice.reducer;
```
</details>

---

## Test Runner Component

### User View
![Test Runner UX](placeholder)

**User Experience Flow:**
1. User configures test parameters
2. User selects test files or modules
3. User launches test execution
4. User views real-time test progress and logs

### Technical Implementation

<details>
<summary><strong>🔍 Component Architecture</strong></summary>

```jsx
// TestRunnerContainer.jsx
import React, { useState } from 'react';
import TestConfigForm from './TestConfigForm';
import TestFileSelector from './TestFileSelector';
import RunnerControls from './RunnerControls';
import TestProgress from './TestProgress';
import { startTestRun } from '../api/runnerApi';

const TestRunnerContainer = ({ projectId }) => {
  const [config, setConfig] = useState({
    environment: 'staging',
    parallelExecutions: 2,
    timeout: 30,
    retryPolicy: 'once'
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [runStatus, setRunStatus] = useState(null);
  
  const handleStartRun = async () => {
    setRunStatus('starting');
    try {
      const runId = await startTestRun(projectId, config, selectedFiles);
      setRunStatus('running');
      // Initialize WebSocket connection to get real-time updates
      initializeRunnerSocket(runId);
    } catch (err) {
      setRunStatus('error');
      console.error(err);
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
        disabled={selectedFiles.length === 0 || runStatus === 'running'} 
      />
      {runStatus && <TestProgress status={runStatus} />}
    </div>
  );
};

export default TestRunnerContainer;
```
</details>

<details>
<summary><strong>🌐 API Endpoints</strong></summary>

| Endpoint | Method | Description | Request Parameters | Response |
|----------|--------|-------------|-------------------|----------|
| `/api/projects/{id}/files` | GET | Lists test files | `projectId` | Array of file objects |
| `/api/runner/start` | POST | Starts a test run | `projectId`, `config`, `files` | Run ID and initial status |
| `/api/runner/{id}/stop` | POST | Stops a running test | `runId` | Status confirmation |
| `/ws/runner/{id}` | WebSocket | Real-time test progress | `runId` | Stream of test events |

```javascript
// runnerApi.js
export const startTestRun = async (projectId, config, files) => {
  const response = await fetch('/api/runner/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      projectId,
      config,
      files: files.map(f => f.id)
    })
  });
  
  const data = await response.json();
  return data.runId;
};

export const initializeRunnerSocket = (runId) => {
  const socket = new WebSocket(`ws://localhost:8080/ws/runner/${runId}`);
  
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Dispatch to store or update component state
    store.dispatch(updateTestProgress(data));
  };
  
  return socket;
};
```
</details>

<details>
<summary><strong>🔄 WebSocket Communication</strong></summary>

```javascript
// Backend WebSocket handler (Node.js example)
const WebSocket = require('ws');
const TestRunner = require('./testRunner');

const startWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws, req) => {
    const runId = req.url.split('/').pop();
    
    // Register this socket to receive updates for this run
    TestRunner.subscribeToRun(runId, (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
    
    ws.on('close', () => {
      TestRunner.unsubscribeFromRun(runId);
    });
  });
};

module.exports = { startWebSocketServer };
```
</details>

<details>
<summary><strong>⚙️ Test Execution Engine</strong></summary>

```javascript
// Backend test runner implementation
class TestExecutionEngine {
  constructor() {
    this.activeRuns = new Map();
    this.subscribers = new Map();
  }
  
  async startRun(projectId, config, files) {
    const runId = generateUniqueId();
    
    // Create child process to run tests
    const testProcess = spawn('node', [
      './test-executor.js',
      '--project', projectId,
      '--files', files.join(','),
      '--parallel', config.parallelExecutions,
      '--timeout', config.timeout,
      '--retry', config.retryPolicy
    ]);
    
    this.activeRuns.set(runId, {
      process: testProcess,
      status: 'running',
      startTime: new Date(),
      results: {
        completed: 0,
        total: files.length,
        passing: 0,
        failing: 0
      }
    });
    
    // Handle process output and notify subscribers
    testProcess.stdout.on('data', (data) => {
      const parsedData = this._parseTestOutput(data);
      this._updateRunState(runId, parsedData);
      this._notifySubscribers(runId);
    });
    
    return runId;
  }
  
  // Additional methods omitted for brevity
}
```
</details>

---

## Results Viewer Component

### User View
![Results Viewer UX](placeholder)

**User Experience Flow:**
1. User selects a completed test run
2. User views summary statistics and charts
3. User can drill down into individual test failures
4. User can export or share test results

### Technical Implementation

<details>
<summary><strong>🔍 Component Architecture</strong></summary>

```jsx
// ResultsViewerContainer.jsx
import React, { useEffect, useState } from 'react';
import ResultsSummary from './ResultsSummary';
import FailureDetails from './FailureDetails';  
import ResultsActionBar from './ResultsActionBar';
import { fetchTestResults, exportResults } from '../api/resultsApi';

const ResultsViewerContainer = ({ testId }) => {
  const [results, setResults] = useState(null);
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      try {
        const data = await fetchTestResults(testId);
        setResults(data);
      } catch (err) {
        console.error("Failed to load results:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadResults();
  }, [testId]);
  
  const handleExport = async (format) => {
    await exportResults(testId, format);
  };
  
  if (loading) return <div>Loading results...</div>;
  
  return (
    <div className="results-viewer-container">
      <h1>Test Results</h1>
      <ResultsActionBar 
        onExport={handleExport}
        canShare={results && results.status === 'completed'} 
      />
      {results && (
        <ResultsSummary 
          results={results} 
          onFailureSelect={setSelectedFailure} 
        />
      )}
      {selectedFailure && (
        <FailureDetails failure={selectedFailure} />
      )}
    </div>
  );
};

export default ResultsViewerContainer;
```
</details>

<details>
<summary><strong>📊 Data Visualization</strong></summary>

```jsx
// ResultsSummary.jsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const ResultsSummary = ({ results, onFailureSelect }) => {
  const chartData = [
    { name: 'Passed', value: results.passCount, color: '#4CAF50' },
    { name: 'Failed', value: results.failCount, color: '#F44336' },
    { name: 'Skipped', value: results.skippedCount, color: '#FFC107' }
  ];
  
  return (
    <div className="results-summary">
      <div className="summary-stats">
        <div className="stat-card">
          <h3>Total Tests</h3>
          <p>{results.passCount + results.failCount + results.skippedCount}</p>
        </div>
        <div className="stat-card">
          <h3>Duration</h3>
          <p>{formatDuration(results.duration)}</p>
        </div>
        <div className="stat-card">
          <h3>Pass Rate</h3>
          <p>{calculatePassRate(results)}%</p>
        </div>
      </div>
      
      <div className="results-chart">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="failure-list">
        <h3>Failed Tests</h3>
        {results.errorLogs.length === 0 ? (
          <p>No failures!</p>
        ) : (
          <ul>
            {results.errorLogs.map(failure => (
              <li 
                key={failure.id}
                onClick={() => onFailureSelect(failure)}
                className="failure-item"
              >
                {failure.testName}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ResultsSummary;
```
</details>

<details>
<summary><strong>🌐 API Endpoints</strong></summary>

| Endpoint | Method | Description | Request Parameters | Response |
|----------|--------|-------------|-------------------|----------|
| `/api/results/{id}` | GET | Fetches test results | `testId` | Complete results object |
| `/api/results/{id}/export` | GET | Exports results | `testId`, `format` | File download |
| `/api/results/{id}/share` | POST | Creates shareable link | `testId`, `expiration` | Share URL |

```javascript
// resultsApi.js
export const fetchTestResults = async (testId) => {
  const response = await fetch(`/api/results/${testId}`);
  return response.json();
};

export const exportResults = async (testId, format = 'json') => {
  window.location.href = `/api/results/${testId}/export?format=${format}`;
};

export const shareResults = async (testId, expiration = '7d') => {
  const response = await fetch(`/api/results/${testId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ expiration })
  });
  
  return response.json();
};
```
</details>

---

## Implementation Options

### 1. Interactive Documentation Portal

Build a dedicated portal that serves as both product documentation and technical reference:

```jsx
// DocumentationPortal.jsx
import React, { useState } from 'react';
import FlowDiagram from './FlowDiagram';
import TechnicalDetails from './TechnicalDetails';

const DocumentationPortal = () => {
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [viewMode, setViewMode] = useState('user'); // 'user' or 'technical'
  
  return (
    <div className="documentation-portal">
      <header>
        <h1>Project Philly Documentation</h1>
        <div className="view-toggle">
          <button 
            className={viewMode === 'user' ? 'active' : ''}
            onClick={() => setViewMode('user')}
          >
            User View
          </button>
          <button 
            className={viewMode === 'technical' ? 'active' : ''}
            onClick={() => setViewMode('technical')}
          >
            Technical View
          </button>
        </div>
      </header>
      
      <main>
        <div className="flow-container">
          <FlowDiagram 
            onComponentSelect={setSelectedComponent}
            viewMode={viewMode}
          />
        </div>
        
        {selectedComponent && (
          <div className="details-container">
            <TechnicalDetails 
              component={selectedComponent}
              viewMode={viewMode}
            />
          </div>
        )}
      </main>
    </div>
  );
};
```

### 2. GitHub Repository with Connected Documentation

Structure your GitHub repository to link code and documentation:

```
/project-philly
  /docs
    /components
      dashboard.md  # Contains both UX flows and technical details
      test-runner.md
      results-viewer.md
    /architecture
      system-overview.md
      api-reference.md
    /flows
      complete-test-flow.md  # End-to-end flow documentation
  /src
    /components
      /Dashboard
        # Code links back to /docs/components/dashboard.md
      /TestRunner
        # Code links back to /docs/components/test-runner.md
```

### 3. Developer Mode in Project Philly

Add a "Developer Mode" toggle in the actual Project Philly application:

```jsx
// App.jsx
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TestRunner from './components/TestRunner';
import ResultsViewer from './components/ResultsViewer';
import Header from './components/Header';
import DevModePanel from './components/DevModePanel';

const App = () => {
  const [devMode, setDevMode] = useState(false);
  
  return (
    <div className="app">
      <Header 
        devMode={devMode}
        onDevModeToggle={() => setDevMode(!devMode)} 
      />
      
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/runner" element={<TestRunner />} />
          <Route path="/results/:id" element={<ResultsViewer />} />
        </Routes>
        
        {devMode && <DevModePanel />}
      </div>
    </div>
  );
};
```

---

## Benefits of This Approach

1. **Knowledge Sharing** - Helps new team members understand both the user experience and code structure
2. **Alignment** - Ensures developers understand how their code impacts the user experience
3. **Maintainability** - Makes it easier to update documentation when code changes
4. **Collaboration** - Improves communication between developers, designers, and product managers
5. **Onboarding** - Accelerates the onboarding process for new team members

## Next Steps

1. Choose your preferred implementation approach
2. Start with documenting one key flow end-to-end
3. Establish documentation standards for both UX and technical aspects
4. Create templates for future component documentation
5. Integrate this documentation process into your development workflow