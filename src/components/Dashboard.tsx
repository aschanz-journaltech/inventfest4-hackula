import React, { useState, useEffect } from "react";
import {
  jiraApi,
  type JiraUser,
  type JiraProject,
  type JiraIssue,
} from "../services/jiraApi";
import "./Dashboard.css";

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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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

        {error && <div className="error-message">{error}</div>}

        {loading && <div className="loading">Loading...</div>}

        {selectedProject && issues.length > 0 && (
          <div className="issues-section">
            <h3>Issues in {selectedProject}</h3>
            <div className="issues-grid">
              {issues.map((issue) => (
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
                      <span>Created: {formatDate(issue.fields.created)}</span>
                      <span>Updated: {formatDate(issue.fields.updated)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedProject && issues.length === 0 && !loading && (
          <div className="no-issues">No issues found in this project.</div>
        )}
      </main>
    </div>
  );
};
