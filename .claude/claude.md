# Story Point Sleuth - Architecture Documentation

## Project Overview

**Story Point Sleuth** is a React-based web application that analyzes JIRA story point estimation accuracy by comparing estimated effort (story points) against actual measured effort (logged hours). Built for InventFest4 hackathon to support company-wide Scrum adoption.

**Core Purpose**: Provide data-driven insights into Agile estimation patterns to help teams improve sprint planning accuracy and velocity predictability.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend Framework** | React | 19.1.1 | UI library with hooks-based state management |
| **Language** | TypeScript | 5.9.3 | Type-safe development |
| **Build Tool** | Vite | 7.1.7 | Fast dev server and production builds |
| **Charts** | Chart.js | 4.5.1 | Canvas-based chart rendering |
| **Charts Integration** | react-chartjs-2 | 5.3.0 | React wrapper for Chart.js |
| **HTTP Client** | Axios | 1.12.2 | JIRA REST API communication |
| **Crypto** | crypto-js | 4.2.0 | OAuth PKCE implementation |
| **Styling** | CSS3 | - | Custom CSS with flexbox/grid, dark mode |
| **Linting** | ESLint | 9.36.0 | Code quality enforcement |

---

## Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    App.tsx                            │  │
│  │  • Entry point                                        │  │
│  │  • Authentication state management                    │  │
│  │  • Route to LoginForm or Dashboard                    │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│     ┌───────────┴────────────┐                              │
│     │                        │                              │
│  ┌──▼─────────────┐   ┌──────▼──────────┐                  │
│  │  LoginForm     │   │   Dashboard     │                  │
│  │  • OAuth setup │   │   • Main UI     │                  │
│  │  • Credentials │   │   • Charts      │                  │
│  └──┬─────────────┘   │   • Analytics   │                  │
│     │                 └──────┬──────────┘                  │
│     │                        │                              │
│  ┌──▼─────────────┐          │                              │
│  │  OAuthLogin    │          │                              │
│  │  • Callback    │          │                              │
│  │  • Token swap  │          │                              │
│  └──┬─────────────┘          │                              │
│     │                        │                              │
│     └────────────┬───────────┘                              │
│                  │                                           │
│           ┌──────▼───────────────────────┐                  │
│           │      jiraApi.ts               │                  │
│           │  • OAuth 2.0 with PKCE        │                  │
│           │  • JIRA REST API v3 wrapper   │                  │
│           │  • Token management           │                  │
│           └──────┬────────────────────────┘                  │
│                  │                                           │
└──────────────────┼───────────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   JIRA Cloud API    │
         │   • Projects        │
         │   • Issues          │
         │   • Fields          │
         │   • Worklogs        │
         └─────────────────────┘
```

---

## Directory Structure

```
/Users/jsiemens/source/inventfest4-hackula/
├── src/
│   ├── components/
│   │   ├── LoginForm.tsx          # OAuth credential input form (164 lines)
│   │   ├── LoginForm.css
│   │   ├── OAuthLogin.tsx         # OAuth callback handler
│   │   ├── OAuthLogin.css
│   │   ├── Dashboard.tsx          # Main application UI (1807 lines)
│   │   ├── Dashboard.css
│   │   └── index.css
│   │
│   ├── services/
│   │   └── jiraApi.ts             # JIRA API integration layer (666 lines)
│   │
│   ├── utils/
│   │   └── oauthDebug.ts          # Browser console debugging utilities
│   │
│   ├── App.tsx                    # Application entry point
│   ├── App.css
│   └── main.tsx                   # React bootstrap
│
├── package.json                   # Dependencies and npm scripts
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                 # Vite build configuration
├── eslint.config.js               # ESLint rules
│
├── README.md                      # Project documentation
├── OAUTH_TROUBLESHOOTING.md       # OAuth setup guide
├── PRESENTATION_SCRIPT.md         # Hackathon presentation script
└── .claude/
    └── claude.md                  # This file
```

---

## Component Architecture

### 1. App.tsx
**Purpose**: Root component and authentication orchestrator

**State Management**:
```typescript
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

**Responsibilities**:
- Load user session from sessionStorage on mount
- Route to LoginForm if unauthenticated
- Route to Dashboard if authenticated
- Handle logout flow

---

### 2. LoginForm.tsx (164 lines)
**Purpose**: OAuth credential input and authorization initiation

**State**:
```typescript
const [jiraBaseUrl, setJiraBaseUrl] = useState('');
const [clientId, setClientId] = useState('');
const [clientSecret, setClientSecret] = useState('');
const [showHelp, setShowHelp] = useState(false);
```

**Flow**:
1. User enters JIRA URL, OAuth Client ID, Client Secret
2. On submit → calls `jiraApi.getAuthorizationUrl()`
3. Redirects to Atlassian OAuth authorization page
4. User authorizes app
5. Redirects back to `/oauth/callback` → OAuthLogin.tsx

**Key Features**:
- Input validation (URL format, required fields)
- Collapsible help section for OAuth setup
- Error handling

---

### 3. OAuthLogin.tsx
**Purpose**: OAuth callback handler and token exchange

**Flow**:
1. Parse URL parameters: `code`, `state`
2. Validate state against sessionStorage (CSRF protection)
3. Call `jiraApi.handleOAuthCallback(code, state)`
4. Receive user object with access token
5. Store in sessionStorage
6. Redirect to root (`/`) → App.tsx → Dashboard.tsx

**Security**:
- PKCE (Proof Key for Code Exchange) implementation
- State parameter validation
- Token stored in sessionStorage (cleared on logout)

---

### 4. Dashboard.tsx (1807 lines - CORE APPLICATION)
**Purpose**: Main application UI with analytics and visualizations

**State Management** (15+ state variables):
```typescript
// Data states
const [projects, setProjects] = useState<Project[]>([]);
const [selectedProject, setSelectedProject] = useState<string>('');
const [issues, setIssues] = useState<Issue[]>([]);
const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]);

// UI states
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [activeFilter, setActiveFilter] = useState<TimeFilter>('all');
const [darkMode, setDarkMode] = useState(() =>
  localStorage.getItem('darkMode') === 'true'
);

// Chart states
const [boxplotChartData, setBoxplotChartData] = useState<ChartData | null>(null);
const [scatterplotChartData, setScatterplotChartData] = useState<ChartData | null>(null);
const [histogramChartData, setHistogramChartData] = useState<ChartData | null>(null);

// Modal states
const [modalChart, setModalChart] = useState<'boxplot' | 'scatterplot' | 'histogram' | null>(null);
```

**Core Functions**:

#### Data Loading
```typescript
// Load all accessible JIRA projects
const loadProjects = async () => {
  const projectData = await getProjects(user.accessToken, user.cloudId);
  setProjects(projectData);
};

// Load all completed issues with story points for selected project
const loadIssues = async () => {
  const jql = `project = "${selectedProject}" AND
               "Story Points" IS NOT EMPTY AND
               status IN (Done, Resolved) AND
               timespent > 0
               ORDER BY updated DESC`;

  const issuesData = await getAllIssues(user.accessToken, user.cloudId, jql);
  setIssues(issuesData);
};
```

#### Data Processing
```typescript
// Extract story points and logged hours from issues
const processIssuesForCharts = (issues: Issue[]) => {
  return issues.map(issue => ({
    key: issue.key,
    storyPoints: issue.fields.customfield_10021 || 0, // Story Points field
    timeSpent: (issue.fields.timespent || 0) / 3600,  // Convert seconds to hours
    updated: issue.fields.updated
  }));
};

// Group by story point value, calculate statistics
const createBoxplotData = (chartIssues: ChartIssue[]) => {
  // Group by story point value
  const grouped = groupBy(chartIssues, 'storyPoints');

  // For each group, calculate:
  // - Q1 (25th percentile)
  // - Median (50th percentile)
  // - Q3 (75th percentile)
  // - Mean
  // - Standard deviation
  // - Min/Max whiskers (1.5 * IQR)
  // - Outliers
};

// Create scatterplot with linear regression
const createScatterplotData = (chartIssues: ChartIssue[]) => {
  // Plot each issue as (storyPoints, timeSpent)
  // Calculate linear regression: y = mx + b
  // Draw trend line
};

// Create histogram with time buckets
const createHistogramData = (chartIssues: ChartIssue[]) => {
  // Buckets: 0-2h, 2-4h, 4-6h, 6-8h, 8-10h, 10-12h,
  //          12-16h, 16-20h, 20-24h, 24-32h, 32-40h, 40+h
  // Group issues by story point value
  // Count frequency in each bucket per story point
};

// Create performance summary boxes
const createStoryPointBoxes = (chartIssues: ChartIssue[]) => {
  // Calculate overall average: total_hours / total_story_points
  // For each story point value:
  //   - Average hours
  //   - Standard deviation
  //   - Count
  //   - Percentage difference from overall average
  //   - Color: green (<15% diff), orange (15-30%), red (>30%)
};
```

#### Time Filtering
```typescript
const applyTimeFilter = (issues: Issue[], filter: TimeFilter) => {
  const now = new Date();
  const cutoffDates = {
    hour: subHours(now, 1),
    day: subDays(now, 1),
    week: subWeeks(now, 1),
    month: subMonths(now, 1),
    '3months': subMonths(now, 3),
    all: new Date(0) // Beginning of time
  };

  return issues.filter(issue =>
    new Date(issue.fields.updated) >= cutoffDates[filter]
  );
};
```

**UI Sections**:
1. **Header**: Logo, project selector, dark mode toggle, logout
2. **Filters**: Time period buttons (All, 3M, 1M, 1W, 1D, 1H)
3. **Performance Boxes**: Color-coded story point summaries
4. **Charts Section**:
   - Boxplot (distribution of hours per story point)
   - Scatterplot (story points vs hours with trend line)
   - Histogram (time distribution by story point)
5. **Footer**: Stats summary, issue count, field inspector
6. **Modals**: Enlarged chart views

**Key Features**:
- Click chart to open modal (full-screen view)
- Hover tooltips with detailed stats
- Clickable JIRA issue keys (open in new tab)
- Dark mode (persisted in localStorage)
- Responsive design (mobile-friendly)

---

### 5. jiraApi.ts (666 lines - API INTEGRATION LAYER)
**Purpose**: Complete JIRA REST API v3 integration with OAuth 2.0

**OAuth Methods**:

```typescript
// Generate OAuth authorization URL with PKCE
export const getAuthorizationUrl = (
  jiraBaseUrl: string,
  clientId: string,
  redirectUri: string
): string => {
  // 1. Generate code_verifier (random string)
  // 2. Generate code_challenge (SHA256 hash of verifier)
  // 3. Generate state (CSRF token)
  // 4. Store verifier and state in sessionStorage
  // 5. Return authorization URL with parameters:
  //    - audience=api.atlassian.com
  //    - client_id
  //    - scope=read:jira-work read:jira-user offline_access
  //    - redirect_uri
  //    - state
  //    - response_type=code
  //    - code_challenge
  //    - code_challenge_method=S256
};

// Handle OAuth callback and exchange code for token
export const handleOAuthCallback = async (
  code: string,
  state: string
): Promise<User> => {
  // 1. Validate state parameter
  // 2. Retrieve code_verifier from sessionStorage
  // 3. Exchange authorization code for access token
  // 4. Fetch accessible JIRA sites (cloud IDs)
  // 5. Return User object with token and cloudId
};

// Exchange authorization code for access token
const exchangeCodeForToken = async (
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<TokenResponse> => {
  // POST https://auth.atlassian.com/oauth/token
  // Body: {
  //   grant_type: 'authorization_code',
  //   client_id,
  //   client_secret,
  //   code,
  //   redirect_uri,
  //   code_verifier
  // }
  // Returns: { access_token, refresh_token, expires_in, scope }
};
```

**JIRA API Methods**:

```typescript
// Get all accessible JIRA projects
export const getProjects = async (
  accessToken: string,
  cloudId: string
): Promise<Project[]> => {
  // GET /rest/api/3/project/search
  // Returns: Array of { id, key, name }
};

// Get issues with JQL query (paginated)
export const getIssues = async (
  accessToken: string,
  cloudId: string,
  jql: string,
  startAt: number = 0,
  maxResults: number = 100
): Promise<IssueResponse> => {
  // GET /rest/api/3/search?jql={jql}&startAt={startAt}&maxResults={maxResults}
  // Fields requested: summary, status, customfield_10021, timespent,
  //                   timetracking, worklog, updated
};

// Get ALL issues (handles pagination automatically)
export const getAllIssues = async (
  accessToken: string,
  cloudId: string,
  jql: string
): Promise<Issue[]> => {
  let startAt = 0;
  const maxResults = 100;
  let allIssues: Issue[] = [];
  let hasMore = true;

  while (hasMore) {
    const response = await getIssues(accessToken, cloudId, jql, startAt, maxResults);
    allIssues = [...allIssues, ...response.issues];
    startAt += maxResults;
    hasMore = response.total > startAt;
  }

  return allIssues;
};

// Get all field metadata
export const getAllFields = async (
  accessToken: string,
  cloudId: string
): Promise<Field[]> => {
  // GET /rest/api/3/field
  // Returns: Array of { id, name, schema, custom }
};

// Find story points custom field ID
export const findStoryPointsField = async (
  accessToken: string,
  cloudId: string
): Promise<string | null> => {
  // Search for field with name containing "story points" (case-insensitive)
  // Common IDs: customfield_10021, customfield_10016, customfield_10004
};
```

**Data Extraction Logic**:

```typescript
// Story Points Field (hardcoded for this instance)
const STORY_POINTS_FIELD = 'customfield_10021';

// Time Logged (multiple sources checked)
const getTimeSpent = (issue: Issue): number => {
  // Priority order:
  // 1. issue.fields.timespent (seconds)
  // 2. issue.fields.timetracking?.timeSpentSeconds
  // 3. Sum of issue.fields.worklog?.worklogs[].timeSpentSeconds
  // Returns: total seconds logged
};
```

**Authentication State**:
```typescript
// Stored in sessionStorage
interface StoredOAuthState {
  codeVerifier: string;
  state: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Stored in sessionStorage
interface User {
  accessToken: string;
  cloudId: string;
  refreshToken?: string;
}
```

---

## Data Flow

### 1. Authentication Flow
```
User opens app
  ↓
App.tsx checks sessionStorage for user
  ↓
No user → render LoginForm
  ↓
User enters OAuth credentials
  ↓
LoginForm calls getAuthorizationUrl()
  ↓
Store codeVerifier + state in sessionStorage
  ↓
Redirect to Atlassian OAuth page
  ↓
User authorizes app
  ↓
Redirect to /oauth/callback?code=XXX&state=YYY
  ↓
OAuthLogin component loads
  ↓
Parse URL params, validate state
  ↓
Call handleOAuthCallback(code, state)
  ↓
Exchange code for access_token (with PKCE verifier)
  ↓
Fetch accessible JIRA sites (cloudId)
  ↓
Return User object { accessToken, cloudId }
  ↓
Store User in sessionStorage
  ↓
Redirect to /
  ↓
App.tsx loads user from sessionStorage
  ↓
Render Dashboard
```

### 2. Data Loading Flow
```
Dashboard mounts
  ↓
useEffect: loadProjects()
  ↓
GET /rest/api/3/project/search
  ↓
Store projects in state
  ↓
User selects project from dropdown
  ↓
loadIssues() triggered
  ↓
Build JQL query:
  - project = "PROJECT_KEY"
  - "Story Points" IS NOT EMPTY
  - status IN (Done, Resolved)
  - timespent > 0
  - ORDER BY updated DESC
  ↓
GET /rest/api/3/search (paginated, 100 per request)
  ↓
Combine all pages into issues array
  ↓
Store issues in state
  ↓
Apply time filter (default: all)
  ↓
Store filteredIssues in state
  ↓
useEffect: regenerate charts when filteredIssues changes
  ↓
processIssuesForCharts(filteredIssues)
  ↓
createBoxplotData() → setBoxplotChartData()
createScatterplotData() → setScatterplotChartData()
createHistogramData() → setHistogramChartData()
createStoryPointBoxes() → render performance boxes
  ↓
Charts render with Chart.js
```

### 3. User Interaction Flow
```
User clicks time filter button (e.g., "Past Week")
  ↓
setActiveFilter('week')
  ↓
useEffect: applyTimeFilter(issues, 'week')
  ↓
Filter issues by updated date >= 7 days ago
  ↓
setFilteredIssues()
  ↓
Charts regenerate with filtered data

---

User clicks chart
  ↓
setModalChart('boxplot' | 'scatterplot' | 'histogram')
  ↓
Modal renders with enlarged chart
  ↓
User clicks close or outside modal
  ↓
setModalChart(null)
  ↓
Modal disappears

---

User clicks JIRA issue key (e.g., "PROJ-123")
  ↓
window.open(`${jiraBaseUrl}/browse/PROJ-123`)
  ↓
Opens issue in new tab

---

User toggles dark mode
  ↓
setDarkMode(!darkMode)
  ↓
localStorage.setItem('darkMode', !darkMode)
  ↓
document.body.classList.toggle('dark-mode')
  ↓
CSS variables update colors
```

---

## Chart Data Structures

### Boxplot Data
```typescript
{
  labels: ['1 SP', '2 SP', '3 SP', '5 SP', '8 SP', '13 SP'],
  datasets: [
    {
      label: 'Min to Q1',
      data: [1.5, 2.8, 3.2, 5.1, 8.3, 15.2],
      backgroundColor: '#93c5fd', // Light blue
    },
    {
      label: 'Q1 to Median',
      data: [2.1, 3.5, 4.8, 7.2, 11.5, 20.3],
      backgroundColor: '#60a5fa', // Medium blue
    },
    {
      label: 'Median to Q3',
      data: [2.8, 4.2, 6.1, 9.8, 14.7, 25.8],
      backgroundColor: '#3b82f6', // Dark blue
    },
    {
      label: 'Q3 to Max',
      data: [3.5, 5.1, 7.8, 12.5, 18.2, 32.1],
      backgroundColor: '#1e40af', // Navy blue
    }
  ]
}
```

### Scatterplot Data
```typescript
{
  labels: [], // Not used
  datasets: [
    {
      label: 'Issues',
      data: [
        { x: 1, y: 2.5, issueKey: 'PROJ-101' },
        { x: 3, y: 6.2, issueKey: 'PROJ-102' },
        { x: 5, y: 18.7, issueKey: 'PROJ-103' },
        // ... more points
      ],
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      type: 'scatter'
    },
    {
      label: 'Trend Line (y = 3.8x + 1.2)',
      data: [
        { x: 0, y: 1.2 },
        { x: 13, y: 50.6 }
      ],
      borderColor: 'rgba(239, 68, 68, 0.8)',
      type: 'line'
    }
  ]
}
```

### Histogram Data
```typescript
{
  labels: ['0-2h', '2-4h', '4-6h', '6-8h', '8-10h', '10-12h', '12-16h', '16-20h', '20-24h', '24-32h', '32-40h', '40+h'],
  datasets: [
    {
      label: '1 SP (mean: 2.3h, σ: 0.8h)',
      data: [5, 12, 8, 3, 1, 0, 0, 0, 0, 0, 0, 0],
      backgroundColor: '#10b981', // Green
    },
    {
      label: '3 SP (mean: 6.2h, σ: 1.8h)',
      data: [0, 3, 8, 10, 6, 2, 1, 0, 0, 0, 0, 0],
      backgroundColor: '#3b82f6', // Blue
    },
    {
      label: '5 SP (mean: 18.5h, σ: 5.3h)',
      data: [0, 0, 1, 2, 5, 8, 10, 6, 3, 2, 1, 0],
      backgroundColor: '#f59e0b', // Orange
    },
    // ... more story point values
  ]
}
```

---

## Key Algorithms

### 1. Linear Regression (Scatterplot Trend Line)
```typescript
const calculateLinearRegression = (points: {x: number, y: number}[]) => {
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + (p.x * p.y), 0);
  const sumX2 = points.reduce((sum, p) => sum + (p.x * p.x), 0);

  // y = mx + b
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
};
```

### 2. Quartile Calculation (Boxplot)
```typescript
const calculateQuartiles = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const median = (arr: number[], start: number, end: number) => {
    const slice = arr.slice(start, end);
    const mid = Math.floor(slice.length / 2);
    return slice.length % 2 === 0
      ? (slice[mid - 1] + slice[mid]) / 2
      : slice[mid];
  };

  const Q2 = median(sorted, 0, n); // Median
  const Q1 = median(sorted, 0, Math.floor(n / 2)); // Lower quartile
  const Q3 = median(sorted, Math.ceil(n / 2), n); // Upper quartile

  const IQR = Q3 - Q1;
  const lowerWhisker = Math.max(sorted[0], Q1 - 1.5 * IQR);
  const upperWhisker = Math.min(sorted[n - 1], Q3 + 1.5 * IQR);

  const outliers = sorted.filter(v => v < lowerWhisker || v > upperWhisker);

  return { Q1, Q2, Q3, min: lowerWhisker, max: upperWhisker, outliers };
};
```

### 3. Standard Deviation
```typescript
const calculateStdDev = (values: number[], mean: number) => {
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
};
```

### 4. Performance Scoring (Story Point Boxes)
```typescript
const scorePerformance = (actualHours: number, expectedHours: number) => {
  const percentDiff = Math.abs(actualHours - expectedHours) / expectedHours;

  if (percentDiff < 0.15) return 'green';  // Within 15%
  if (percentDiff < 0.30) return 'orange'; // 15-30% off
  return 'red'; // >30% off
};
```

---

## Configuration

### Environment Variables
None required - all configuration is user-provided via OAuth form.

### JIRA Custom Fields
```typescript
// Story Points field ID (varies by JIRA instance)
// Common values:
// - customfield_10021 (used in this project)
// - customfield_10016
// - customfield_10004

// To find your field ID:
// 1. Use the Field Inspector in Dashboard
// 2. Look for field with name containing "story points"
// 3. Update STORY_POINTS_FIELD constant in jiraApi.ts
```

### OAuth Configuration
Required for each user:
- **JIRA Base URL**: `https://your-domain.atlassian.net`
- **Client ID**: From Atlassian Developer Console OAuth 2.0 app
- **Client Secret**: From Atlassian Developer Console OAuth 2.0 app
- **Redirect URI**: `http://localhost:5173/oauth/callback` (dev) or production URL

OAuth Scopes:
- `read:jira-work` - Read issues, projects, worklogs
- `read:jira-user` - Read user profile
- `offline_access` - Refresh token (optional)

---

## NPM Scripts

```json
{
  "dev": "vite",                    // Start dev server (http://localhost:5173)
  "build": "tsc && vite build",     // TypeScript compile + production build
  "lint": "eslint .",               // Run ESLint on all files
  "preview": "vite preview"         // Preview production build locally
}
```

---

## Development Workflow

### Starting the App
```bash
npm install          # Install dependencies
npm run dev          # Start dev server
# Open http://localhost:5173
```

### OAuth Setup (First Time)
1. Go to https://developer.atlassian.com/console/myapps/
2. Create OAuth 2.0 (3LO) app
3. Set redirect URI: `http://localhost:5173/oauth/callback`
4. Enable permissions: read:jira-work, read:jira-user
5. Copy Client ID and Client Secret
6. Enter in LoginForm

### Making Changes
1. Edit files in `src/`
2. Vite auto-reloads (HMR)
3. Check console for TypeScript/ESLint errors
4. Run `npm run lint` before committing

### Building for Production
```bash
npm run build        # Output: dist/
npm run preview      # Test production build locally
```

---

## API Integration Details

### Base URLs
```typescript
const ATLASSIAN_AUTH_URL = 'https://auth.atlassian.com';
const ATLASSIAN_API_URL = 'https://api.atlassian.com';
const JIRA_API_BASE = `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3`;
```

### Request Headers
```typescript
{
  'Authorization': `Bearer ${accessToken}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json'
}
```

### Rate Limiting
JIRA Cloud API has rate limits:
- 10 requests/second per IP
- 1000 requests/hour per user

**Mitigation**:
- Paginate issue requests (100 per call)
- Cache projects in state (don't refetch)
- Filter client-side (time filters don't re-query JIRA)

### Error Handling
```typescript
try {
  const response = await axios.get(url, { headers });
  return response.data;
} catch (error) {
  if (error.response?.status === 401) {
    // Token expired - logout and re-authenticate
    logout();
  } else if (error.response?.status === 403) {
    // Permission denied - show error message
    setError('You do not have permission to access this resource');
  } else {
    // Generic error
    setError(error.message);
  }
}
```

---

## State Management Patterns

### Authentication State
- Stored in: `sessionStorage` (survives tab refresh, not new tabs)
- Keys: `jira_user` (JSON: `{ accessToken, cloudId }`)
- Cleared on: Logout, OAuth errors

### UI State
- Component-local state with `useState`
- No global state library (Redux, Zustand) needed
- Props passed from App → Dashboard

### Data Caching
- Projects: Loaded once on Dashboard mount, cached in state
- Issues: Loaded per project, cached in state
- Time filters: Applied client-side, no re-fetch

### Dark Mode
- Stored in: `localStorage` (persists across sessions)
- Key: `darkMode` (value: `'true'` or `'false'`)
- Applied via: CSS class `dark-mode` on `<body>`

---

## CSS Architecture

### Variables (Light Mode)
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border: #e5e7eb;
  --accent: #3b82f6;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
}
```

### Variables (Dark Mode)
```css
body.dark-mode {
  --bg-primary: #1f2937;
  --bg-secondary: #111827;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border: #374151;
  --accent: #60a5fa;
  --success: #34d399;
  --warning: #fbbf24;
  --error: #f87171;
}
```

### Layout Patterns
- **Flexbox**: Header, filters, performance boxes
- **CSS Grid**: Chart grid (2 columns on desktop, 1 on mobile)
- **Responsive breakpoints**:
  - Desktop: >1024px
  - Tablet: 768px-1024px
  - Mobile: <768px

---

## Testing Considerations

### Manual Testing Checklist
- [ ] OAuth flow (login, callback, token exchange)
- [ ] Project selection and loading
- [ ] Issue loading with pagination (>100 issues)
- [ ] Time filtering (all periods)
- [ ] Chart rendering (boxplot, scatterplot, histogram)
- [ ] Performance boxes (color coding, stats)
- [ ] Modal views (click to enlarge)
- [ ] JIRA links (click issue key opens in new tab)
- [ ] Dark mode toggle
- [ ] Logout and session clearing
- [ ] Error handling (invalid credentials, API errors)
- [ ] Responsive design (mobile, tablet, desktop)

### Edge Cases
- **No completed issues**: Show "No data available" message
- **All issues same story points**: Charts still render with single group
- **No time logged**: Issues filtered out by JQL
- **No story points field**: Field inspector helps find custom field ID
- **Token expiration**: Auto-logout, prompt re-login
- **Large datasets (1000+ issues)**: Pagination handles automatically

---

## Performance Optimization

### Current Optimizations
1. **Pagination**: Fetch 100 issues at a time
2. **Client-side filtering**: Time filters don't re-query API
3. **Memoized calculations**: Charts only regenerate when data changes
4. **Conditional rendering**: Charts only render when data available
5. **Lazy loading**: Projects loaded on mount, issues loaded on selection

### Future Optimizations (if needed)
- Use `React.memo()` for chart components
- Debounce project search input
- Virtual scrolling for large project lists
- Web Workers for heavy statistical calculations
- IndexedDB for caching issue data across sessions

---

## Security Considerations

### Current Security Measures
1. **OAuth 2.0 with PKCE**: Prevents authorization code interception
2. **State parameter**: CSRF protection in OAuth flow
3. **SessionStorage**: Tokens not persisted across browser sessions
4. **No hardcoded credentials**: User provides OAuth app credentials
5. **HTTPS only**: OAuth requires secure connections

### Security Best Practices
- Never commit `.env` files with credentials
- Use environment variables for production OAuth config
- Implement token refresh for long-lived sessions
- Add rate limiting on client-side to prevent abuse
- Sanitize user inputs (project names, etc.)

---

## Common Issues & Troubleshooting

### Issue: "Invalid state parameter"
**Cause**: SessionStorage cleared between authorization and callback
**Solution**: Don't clear browser data during OAuth flow

### Issue: "Cannot find story points field"
**Cause**: Custom field ID differs by JIRA instance
**Solution**: Use Field Inspector, find correct ID, update `customfield_10021` in code

### Issue: "No issues loaded"
**Cause**: JQL query too restrictive (no completed issues with story points + time)
**Solution**: Ensure issues have:
  - Status: Done or Resolved
  - Story Points: Set (not empty)
  - Time Logged: Greater than 0

### Issue: Charts not rendering
**Cause**: Invalid data format or Chart.js version mismatch
**Solution**: Check browser console for errors, ensure Chart.js 4.5.1

### Issue: OAuth redirect fails
**Cause**: Redirect URI mismatch between app and OAuth app config
**Solution**: Ensure redirect URI in code matches Atlassian Developer Console exactly

---

## Future Enhancement Ideas

### Short-term (1-2 sprints)
- [ ] Export charts as PNG/PDF
- [ ] CSV export of raw data
- [ ] Team comparison (multi-project analysis)
- [ ] Sprint-over-sprint tracking
- [ ] Customizable time buckets for histogram

### Medium-term (3-6 sprints)
- [ ] Predictive modeling (suggest story points for new issues)
- [ ] Team member analysis (anonymized estimator accuracy)
- [ ] Integration with sprint planning tools
- [ ] Real-time capacity suggestions during planning poker
- [ ] Estimation drift alerts (when patterns change significantly)

### Long-term (6+ sprints)
- [ ] Machine learning for estimation recommendations
- [ ] Integration with other project management tools (Asana, Linear)
- [ ] API for external tools to query estimation data
- [ ] Multi-tenant SaaS deployment
- [ ] Admin dashboard for org-wide insights

---

## Git Workflow

### Branch Strategy
- `main`: Production-ready code
- Feature branches: `feature/feature-name`
- Bugfix branches: `bugfix/bug-description`

### Commit Message Format
```
<type>: <description>

[optional body]

Examples:
feat: Add histogram chart visualization
fix: Correct quartile calculation in boxplot
docs: Update OAuth setup guide
refactor: Extract chart data processing to separate functions
```

### Recent Commits (Last 10)
```
a0a0036 Fixed tsc and eslint syntax issues
ded36b5 Added mean and std. dev.
f610edc Added links to jira tickets
b17ff7e Changed ranges
cee1832 Added a legend
9210be8 Improved color scheme
0b66b3e Added more red/green highlighting
ad1330a Added more histogram analysis
5f1f47a Switched to story points field
20f89f0 Added field schema viewer
```

---

## Key Files Line Counts

| File | Lines | Purpose |
|------|-------|---------|
| Dashboard.tsx | 1807 | Main UI and analytics logic |
| jiraApi.ts | 666 | JIRA API integration and OAuth |
| LoginForm.tsx | 164 | OAuth credential input form |
| OAuthLogin.tsx | ~100 | OAuth callback handler |
| App.tsx | ~80 | Application entry point |
| Dashboard.css | ~500 | Dashboard styling |
| Other files | ~200 | Utils, config, types |
| **TOTAL** | **~3500** | Full application codebase |

---

## Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server
npm run lint             # Check code quality
npm run build            # Build for production

# Debugging
window.oauthDebug        # Browser console debugging (see oauthDebug.ts)

# JIRA API Testing
curl -H "Authorization: Bearer $TOKEN" \
  https://api.atlassian.com/ex/jira/$CLOUD_ID/rest/api/3/project/search

# Find Story Points Field
GET /rest/api/3/field
# Look for: { "id": "customfield_XXXXX", "name": "Story Points" }
```

---

## Documentation Resources

- **JIRA REST API v3**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- **OAuth 2.0 (3LO)**: https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/
- **Chart.js Docs**: https://www.chartjs.org/docs/latest/
- **React TypeScript**: https://react-typescript-cheatsheet.netlify.app/
- **Vite Guide**: https://vitejs.dev/guide/

---

## Contact & Support

- **GitHub**: (Add repo URL when published)
- **Developer**: Jason Siemens
- **Hackathon**: InventFest4
- **Company**: (Your company name)
- **Date**: January 2025

---

**Last Updated**: 2025-01-22
**Version**: 1.0.0
**Status**: Production-ready hackathon submission