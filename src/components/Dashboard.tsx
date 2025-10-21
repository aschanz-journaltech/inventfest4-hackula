import React, { useState, useEffect } from "react";
import {
  jiraApi,
  type JiraUser,
  type JiraProject,
  type JiraIssue,
} from "../services/jiraApi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Scatter } from "react-chartjs-2";
import "./Dashboard.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardProps {
  user: JiraUser;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showIssues, setShowIssues] = useState(false);
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [activeGraphs, setActiveGraphs] = useState<{
    boxplot: boolean;
    scatterplot: boolean;
    histogram: boolean;
  }>({
    boxplot: true,
    scatterplot: true,
    histogram: true,
  });
  const [modalGraph, setModalGraph] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await jiraApi.getProjects();
      // Sort projects alphabetically by name
      const sortedProjects = projectsData.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setProjects(sortedProjects);
    } catch (err) {
      setError("Failed to load projects");
      console.error("Error loading projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadIssues = async (projectKey: string) => {
    try {
      setLoading(true);
      setError("");
      const issuesData = await jiraApi.getIssues(projectKey);
      setIssues(issuesData.issues);
    } catch (err) {
      setError("Failed to load issues");
      console.error("Error loading issues:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectKey = e.target.value;
    setSelectedProject(projectKey);
    if (projectKey) {
      loadIssues(projectKey);
    } else {
      setIssues([]);
    }
  };

  // Filter projects based on search query
  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Filter issues by time period
  const filterIssuesByTime = (
    issues: JiraIssue[],
    timeFilter: string
  ): JiraIssue[] => {
    if (timeFilter === "all") return issues;

    const now = new Date();
    const cutoffDate = new Date();

    switch (timeFilter) {
      case "1h":
        cutoffDate.setHours(now.getHours() - 1);
        break;
      case "1d":
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case "1w":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "1m":
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case "3m":
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      default:
        return issues;
    }

    return issues.filter((issue) => {
      const updatedDate = new Date(issue.fields.updated);
      return updatedDate >= cutoffDate;
    });
  };

  const getStatusColor = (statusCategory: string) => {
    switch (statusCategory.toLowerCase()) {
      case "new":
      case "blue-gray":
        return "#42526e";
      case "indeterminate":
      case "yellow":
        return "#ff8b00";
      case "done":
      case "green":
        return "#00875a";
      default:
        return "#42526e";
    }
  };

  // Data processing functions for charts
  const processIssuesForCharts = (issues: JiraIssue[]) => {
    console.log("🔍 Processing issues for charts:", issues.length);

    // Filter issues by time period first
    const filteredIssues = filterIssuesByTime(issues, timeFilter);
    console.log(
      `⏰ Filtered to ${filteredIssues.length} issues from ${
        timeFilter === "all" ? "all time" : `past ${timeFilter}`
      }`
    );

    const processed = filteredIssues.map((issue) => {
      // Try multiple common story points field IDs and look for numeric values
      let storyPoints =
        issue.fields.customfield_10016 ||
        issue.fields.customfield_10004 ||
        issue.fields.customfield_10002 ||
        issue.fields.customfield_10003 ||
        issue.fields.customfield_10005 ||
        0;

      // If no story points found in common fields, look for any numeric custom field
      if (storyPoints === 0) {
        const numericFields = Object.keys(issue.fields)
          .filter((key) => key.startsWith("customfield_"))
          .map((key) => ({ field: key, value: issue.fields[key] }))
          .filter(
            (item) =>
              typeof item.value === "number" &&
              item.value > 0 &&
              item.value <= 100
          );

        if (numericFields.length > 0) {
          console.log(
            `🎯 Found potential story points for ${issue.key}:`,
            numericFields[0]
          );
          storyPoints = numericFields[0].value as number;
        }
      }

      // Try multiple sources for time spent (we know this is working!)
      let timeSpentHours = 0;

      // Method 1: Direct timespent field (this should work based on debug)
      if (issue.fields.timespent) {
        timeSpentHours = issue.fields.timespent / 3600;
      }
      // Method 2: timetracking object (this should also work)
      else if (issue.fields.timetracking?.timeSpentSeconds) {
        timeSpentHours = issue.fields.timetracking.timeSpentSeconds / 3600;
      }
      // Method 3: worklog entries
      else if (
        issue.fields.worklog?.worklogs &&
        issue.fields.worklog.worklogs.length > 0
      ) {
        const totalSeconds = issue.fields.worklog.worklogs.reduce(
          (sum, worklog) => sum + worklog.timeSpentSeconds,
          0
        );
        timeSpentHours = totalSeconds / 3600;
      }

      return {
        key: issue.key,
        summary: issue.fields.summary,
        storyPoints,
        timeSpentHours,
      };
    });

    console.log("📊 Processed issues sample:", processed.slice(0, 3));

    const filtered = processed.filter(
      (issue) => issue.storyPoints > 0 || issue.timeSpentHours > 0
    );
    console.log(
      `✅ Filtered issues: ${filtered.length} out of ${processed.length} have story points or logged time`
    );

    const withStoryPoints = filtered.filter((issue) => issue.storyPoints > 0);
    console.log(`📈 Issues with story points: ${withStoryPoints.length}`);

    const withTimeLogged = filtered.filter((issue) => issue.timeSpentHours > 0);
    console.log(`⏱️ Issues with logged time: ${withTimeLogged.length}`);

    const withBothFields = filtered.filter(
      (issue) => issue.storyPoints > 0 && issue.timeSpentHours > 0
    );
    console.log(
      `🎯 Issues with both story points AND logged time: ${withBothFields.length}`
    );

    return filtered;
  };

  const createBoxplotData = () => {
    const processedIssues = processIssuesForCharts(issues);
    const storyPointGroups: { [key: number]: number[] } = {};

    processedIssues.forEach((issue) => {
      if (issue.storyPoints > 0 && issue.timeSpentHours > 0) {
        if (!storyPointGroups[issue.storyPoints]) {
          storyPointGroups[issue.storyPoints] = [];
        }
        storyPointGroups[issue.storyPoints].push(issue.timeSpentHours);
      }
    });

    const labels = Object.keys(storyPointGroups).sort(
      (a, b) => Number(a) - Number(b)
    );

    // Calculate boxplot statistics for each story point group
    const boxplotStats = labels.map((sp) => {
      const hours = storyPointGroups[Number(sp)].sort((a, b) => a - b);
      const n = hours.length;

      const q1Index = Math.floor(n * 0.25);
      const medianIndex = Math.floor(n * 0.5);
      const q3Index = Math.floor(n * 0.75);

      const q1 = hours[q1Index];
      const median = hours[medianIndex];
      const q3 = hours[q3Index];

      // Calculate IQR and whiskers
      const iqr = q3 - q1;
      const lowerWhisker = Math.max(hours[0], q1 - 1.5 * iqr);
      const upperWhisker = Math.min(hours[n - 1], q3 + 1.5 * iqr);

      // Find outliers
      const outliers = hours.filter(
        (h) => h < lowerWhisker || h > upperWhisker
      );

      return {
        q1,
        median,
        q3,
        lowerWhisker,
        upperWhisker,
        outliers,
        count: n,
        label: `${sp} SP`,
      };
    });

    // Create datasets for different parts of the boxplot
    const datasets = [
      // Lower whisker to Q1
      {
        label: "Q1 Range",
        data: boxplotStats.map((stat) => stat.q1 - stat.lowerWhisker),
        backgroundColor: "rgba(0, 82, 204, 0.3)",
        borderColor: "rgba(0, 82, 204, 1)",
        borderWidth: 1,
        stack: "boxplot",
      },
      // Q1 to Median (bottom half of box)
      {
        label: "Q1 to Median",
        data: boxplotStats.map((stat) => stat.median - stat.q1),
        backgroundColor: "rgba(0, 82, 204, 0.6)",
        borderColor: "rgba(0, 82, 204, 1)",
        borderWidth: 1,
        stack: "boxplot",
      },
      // Median to Q3 (top half of box)
      {
        label: "Median to Q3",
        data: boxplotStats.map((stat) => stat.q3 - stat.median),
        backgroundColor: "rgba(0, 82, 204, 0.8)",
        borderColor: "rgba(0, 82, 204, 1)",
        borderWidth: 1,
        stack: "boxplot",
      },
      // Q3 to upper whisker
      {
        label: "Q3 Range",
        data: boxplotStats.map((stat) => stat.upperWhisker - stat.q3),
        backgroundColor: "rgba(0, 82, 204, 0.3)",
        borderColor: "rgba(0, 82, 204, 1)",
        borderWidth: 1,
        stack: "boxplot",
      },
    ];

    return {
      labels: boxplotStats.map((stat) => stat.label),
      datasets: datasets,
    };
  };

  const createScatterplotData = () => {
    const processedIssues = processIssuesForCharts(issues);
    const scatterData = processedIssues
      .filter((issue) => issue.storyPoints > 0 && issue.timeSpentHours > 0)
      .map((issue) => ({
        x: issue.storyPoints,
        y: issue.timeSpentHours,
        label: issue.key,
      }));

    // Calculate linear regression for trend line
    const calculateTrendLine = (data: Array<{ x: number; y: number }>) => {
      if (data.length < 2) return [];

      const n = data.length;
      const sumX = data.reduce((sum, point) => sum + point.x, 0);
      const sumY = data.reduce((sum, point) => sum + point.y, 0);
      const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
      const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);

      // Linear regression formula: y = mx + b
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Find min and max x values to draw the line
      const minX = Math.min(...data.map((p) => p.x));
      const maxX = Math.max(...data.map((p) => p.x));

      return [
        { x: minX, y: slope * minX + intercept },
        { x: maxX, y: slope * maxX + intercept },
      ];
    };

    const trendLineData = calculateTrendLine(scatterData).map(
      (point, index) => ({
        x: point.x,
        y: point.y,
        label: `Trend ${index + 1}`,
      })
    );

    const datasets = [
      {
        label: "Story Points vs Actual Hours Logged",
        data: scatterData,
        backgroundColor: "rgba(0, 135, 90, 0.6)",
        borderColor: "rgba(0, 135, 90, 1)",
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
      },
    ];

    // Add trend line if we have data
    if (trendLineData.length > 0) {
      datasets.push({
        label: "Trend Line",
        data: trendLineData,
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        pointRadius: 0,
        pointHoverRadius: 0,
        showLine: true,
      });
    }

    return {
      datasets: datasets,
    };
  };

  const createHistogramData = () => {
    const processedIssues = processIssuesForCharts(issues);
    const hourEstimates = processedIssues
      .filter((issue) => issue.timeSpentHours > 0)
      .map((issue) => issue.timeSpentHours);

    const buckets = [
      { label: "0-5h", min: 0, max: 5 },
      { label: "5-10h", min: 5, max: 10 },
      { label: "10-20h", min: 10, max: 20 },
      { label: "20-40h", min: 20, max: 40 },
      { label: "40+h", min: 40, max: Infinity },
    ];

    const bucketCounts = buckets.map(
      (bucket) =>
        hourEstimates.filter(
          (hours) => hours >= bucket.min && hours < bucket.max
        ).length
    );

    return {
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          label: "Frequency of Actual Hours Logged",
          data: bucketCounts,
          backgroundColor: "rgba(255, 139, 0, 0.6)",
          borderColor: "rgba(255, 139, 0, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  const renderRealChart = (
    title: string,
    description: string,
    graphType: string
  ) => {
    const processedIssues = processIssuesForCharts(issues);

    if (processedIssues.length === 0) {
      return (
        <div className="graph-placeholder">
          <h4>{title}</h4>
          <div className="empty-graph">
            <p>No data available with story points or logged time</p>
            <p className="data-hint">
              Make sure your JIRA issues have story points and logged work time
            </p>
          </div>
        </div>
      );
    }

    let chartComponent;
    let chartData;
    let options;

    switch (graphType) {
      case "boxplot":
        chartData = createBoxplotData();
        options = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: title },
            legend: {
              display: true,
              position: "top" as const,
            },
            tooltip: {
              mode: "index" as const,
              intersect: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Hours Logged" },
              stacked: true,
            },
            x: {
              title: { display: true, text: "Story Points" },
              stacked: true,
            },
          },
          interaction: {
            mode: "index" as const,
            intersect: false,
          },
        };
        chartComponent = <Bar data={chartData} options={options} />;
        break;

      case "scatterplot":
        chartData = createScatterplotData();
        options = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: title },
          },
          scales: {
            x: {
              title: { display: true, text: "Story Points" },
              beginAtZero: true,
            },
            y: {
              title: { display: true, text: "Hours" },
              beginAtZero: true,
            },
          },
        };
        chartComponent = <Scatter data={chartData} options={options} />;
        break;

      case "histogram":
        chartData = createHistogramData();
        options = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: title },
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Number of Issues" },
            },
            x: {
              title: { display: true, text: "Hours Logged" },
            },
          },
        };
        chartComponent = <Bar data={chartData} options={options} />;
        break;

      default:
        return null;
    }

    return (
      <div
        className="graph-placeholder real-chart clickable-chart"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Opening modal for:", graphType);
          setModalGraph(graphType);
        }}
      >
        <div className="chart-header">
          <h4>{title}</h4>
        </div>
        <p className="chart-description">{description}</p>
        <div className="chart-container">{chartComponent}</div>
        <div className="chart-stats">
          <span>📊 {processedIssues.length} issues with data</span>
        </div>
      </div>
    );
  };

  // Render chart for modal (larger size)
  const renderModalChart = (graphType: string) => {
    const processedIssues = processIssuesForCharts(issues);

    if (processedIssues.length === 0) {
      return (
        <div className="modal-empty-chart">
          <p>No data available with story points or logged time</p>
          <p className="data-hint">
            Make sure your JIRA issues have story points and logged work time
          </p>
        </div>
      );
    }

    let chartComponent;
    let chartData;
    let options;
    let title = "";

    switch (graphType) {
      case "boxplot":
        title = "Boxplot - Actual Hours per Story Point";
        chartData = createBoxplotData();
        options = {
          responsive: true,
          maintainAspectRatio: false,
          aspectRatio: 2,
          plugins: {
            title: { display: true, text: title, font: { size: 18 } },
            legend: {
              display: true,
              position: "top" as const,
              labels: { font: { size: 12 } },
            },
            tooltip: {
              mode: "index" as const,
              intersect: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Hours Logged",
                font: { size: 14 },
              },
              stacked: true,
            },
            x: {
              title: {
                display: true,
                text: "Story Points",
                font: { size: 14 },
              },
              stacked: true,
            },
          },
          interaction: {
            mode: "index" as const,
            intersect: false,
          },
        };
        chartComponent = <Bar data={chartData} options={options} />;
        break;

      case "scatterplot":
        title = "Scatterplot - Story Points vs Logged Hours";
        chartData = createScatterplotData();
        options = {
          responsive: true,
          maintainAspectRatio: false,
          aspectRatio: 2,
          plugins: {
            title: { display: true, text: title, font: { size: 18 } },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: "Story Points",
                font: { size: 14 },
              },
              beginAtZero: true,
            },
            y: {
              title: { display: true, text: "Hours", font: { size: 14 } },
              beginAtZero: true,
            },
          },
        };
        chartComponent = <Scatter data={chartData} options={options} />;
        break;

      case "histogram":
        title = "Histogram - Distribution of Logged Hours";
        chartData = createHistogramData();
        options = {
          responsive: true,
          maintainAspectRatio: false,
          aspectRatio: 2,
          plugins: {
            title: { display: true, text: title, font: { size: 18 } },
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Number of Issues",
                font: { size: 14 },
              },
            },
            x: {
              title: {
                display: true,
                text: "Hours Logged",
                font: { size: 14 },
              },
            },
          },
        };
        chartComponent = <Bar data={chartData} options={options} />;
        break;

      default:
        return null;
    }

    return (
      <div className="modal-chart-container">
        {chartComponent}
        <div className="modal-chart-stats">
          <span>📊 {processedIssues.length} issues with data</span>
        </div>
      </div>
    );
  };

  const toggleGraph = (graphType: keyof typeof activeGraphs) => {
    setActiveGraphs((prev) => ({
      ...prev,
      [graphType]: !prev[graphType],
    }));
  };

  // Calculate filtered issues for display
  const filteredIssues = filterIssuesByTime(issues, timeFilter);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="user-info">
          <img
            src={user.avatarUrls["32x32"]}
            alt={`${user.displayName} avatar`}
            className="user-avatar"
          />
          <div>
            <h2>Welcome, {user.displayName}!</h2>
            <p>{user.emailAddress}</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="jira-instance">{jiraApi.getBaseUrl()}</span>
          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="project-selector">
          <label htmlFor="project-search">Search Projects:</label>
          <input
            id="project-search"
            type="text"
            placeholder="Search by project name or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="project-search-input"
          />

          <label htmlFor="project-select">Select a Project:</label>
          {searchQuery && (
            <p className="filter-info">
              Showing {filteredProjects.length} of {projects.length} projects
            </p>
          )}
          <select
            id="project-select"
            value={selectedProject}
            onChange={handleProjectChange}
            disabled={loading}
          >
            <option value="">-- Choose a project --</option>
            {filteredProjects.map((project) => (
              <option key={project.id} value={project.key}>
                {project.name} ({project.key})
              </option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <div className="graph-controls">
            <h3>Analytics & Reports</h3>
            <div className="graph-buttons">
              <button
                className={`graph-toggle-btn ${
                  activeGraphs.boxplot ? "active" : ""
                }`}
                onClick={() => toggleGraph("boxplot")}
              >
                📦 Boxplot - Actual Hours per Story Point
              </button>
              <button
                className={`graph-toggle-btn ${
                  activeGraphs.scatterplot ? "active" : ""
                }`}
                onClick={() => toggleGraph("scatterplot")}
              >
                📈 Scatterplot - Story Points vs Logged Hours
              </button>
              <button
                className={`graph-toggle-btn ${
                  activeGraphs.histogram ? "active" : ""
                }`}
                onClick={() => toggleGraph("histogram")}
              >
                📊 Histogram - Distribution of Logged Hours
              </button>
            </div>

            <div className="time-filter-section">
              <h4>Time Period Filter</h4>
              <div className="time-filter-buttons">
                <button
                  className={`time-filter-btn ${
                    timeFilter === "all" ? "active" : ""
                  }`}
                  onClick={() => setTimeFilter("all")}
                >
                  All Time
                </button>
                <button
                  className={`time-filter-btn ${
                    timeFilter === "1h" ? "active" : ""
                  }`}
                  onClick={() => setTimeFilter("1h")}
                >
                  Past Hour
                </button>
                <button
                  className={`time-filter-btn ${
                    timeFilter === "1d" ? "active" : ""
                  }`}
                  onClick={() => setTimeFilter("1d")}
                >
                  Past Day
                </button>
                <button
                  className={`time-filter-btn ${
                    timeFilter === "1w" ? "active" : ""
                  }`}
                  onClick={() => setTimeFilter("1w")}
                >
                  Past Week
                </button>
                <button
                  className={`time-filter-btn ${
                    timeFilter === "1m" ? "active" : ""
                  }`}
                  onClick={() => setTimeFilter("1m")}
                >
                  Past Month
                </button>
                <button
                  className={`time-filter-btn ${
                    timeFilter === "3m" ? "active" : ""
                  }`}
                  onClick={() => setTimeFilter("3m")}
                >
                  Past 3 Months
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Render active graphs */}
        {selectedProject && (
          <div className="graphs-section">
            {activeGraphs.boxplot &&
              renderRealChart(
                "Boxplot - Actual Hours per Story Point",
                "Shows the distribution of actual logged hours for each story point value, revealing real effort patterns",
                "boxplot"
              )}
            {activeGraphs.scatterplot &&
              renderRealChart(
                "Scatterplot - Story Points vs Logged Hours",
                "Displays the relationship between story points and actual logged hours to analyze real effort scaling",
                "scatterplot"
              )}
            {activeGraphs.histogram &&
              renderRealChart(
                "Histogram - Distribution of Logged Hours",
                "Shows the frequency distribution of actual logged hours to identify common work effort ranges",
                "histogram"
              )}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {loading && <div className="loading">Loading...</div>}

        {selectedProject && issues.length > 0 && (
          <div className="issues-section">
            <div
              className="issues-header"
              onClick={() => setShowIssues(!showIssues)}
            >
              <h3>
                Issues in {selectedProject} ({filteredIssues.length}
                {timeFilter !== "all" &&
                  ` filtered by ${
                    timeFilter === "1h"
                      ? "past hour"
                      : timeFilter === "1d"
                      ? "past day"
                      : timeFilter === "1w"
                      ? "past week"
                      : timeFilter === "1m"
                      ? "past month"
                      : timeFilter === "3m"
                      ? "past 3 months"
                      : timeFilter
                  }`}
                {filteredIssues.length !== issues.length &&
                  ` of ${issues.length} total`}
                )
              </h3>
              <span className={`dropdown-arrow ${showIssues ? "open" : ""}`}>
                {showIssues ? "▼" : "▶"}
              </span>
            </div>
            {showIssues && (
              <div className="issues-dropdown">
                <div className="issues-grid">
                  {filteredIssues.map((issue) => (
                    <div key={issue.id} className="issue-card">
                      <div className="issue-header">
                        <span className="issue-key">{issue.key}</span>
                        <span
                          className="issue-status"
                          style={{
                            backgroundColor: getStatusColor(
                              issue.fields.status.statusCategory.colorName
                            ),
                            color: "white",
                          }}
                        >
                          {issue.fields.status.name}
                        </span>
                      </div>
                      <h4 className="issue-summary">{issue.fields.summary}</h4>
                      <div className="issue-details">
                        <div className="issue-meta">
                          <span className="issue-priority">
                            Priority: {issue.fields.priority.name}
                          </span>
                          {issue.fields.assignee && (
                            <span className="issue-assignee">
                              Assignee: {issue.fields.assignee.displayName}
                            </span>
                          )}
                        </div>
                        <div className="issue-dates">
                          <span>
                            Created: {formatDate(issue.fields.created)}
                          </span>
                          <span>
                            Updated: {formatDate(issue.fields.updated)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedProject && issues.length === 0 && !loading && (
          <div className="no-issues">No issues found in this project.</div>
        )}
      </main>

      {/* Chart Modal */}
      {modalGraph && (
        <div className="modal-overlay" onClick={() => setModalGraph(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalGraph === "boxplot" &&
                  "Boxplot - Actual Hours per Story Point"}
                {modalGraph === "scatterplot" &&
                  "Scatterplot - Story Points vs Logged Hours"}
                {modalGraph === "histogram" &&
                  "Histogram - Distribution of Logged Hours"}
              </h3>
              <button
                className="modal-close"
                onClick={() => setModalGraph(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-chart">{renderModalChart(modalGraph)}</div>
          </div>
        </div>
      )}
    </div>
  );
};
