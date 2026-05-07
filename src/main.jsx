import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API = "/api";
const emptyTask = {
  title: "",
  description: "",
  status: "TODO",
  priority: "MEDIUM",
  dueDate: "",
  assigneeId: ""
};

function request(path, { token, method = "GET", body } = {}) {
  return fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
  });
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function App() {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem("ttm_session");
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [memberForm, setMemberForm] = useState({ email: "", role: "MEMBER" });
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const token = session?.token;
  const role = project?.role;
  const isAdmin = role === "ADMIN";

  const groupedTasks = useMemo(() => {
    const groups = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const task of project?.tasks || []) groups[task.status].push(task);
    return groups;
  }, [project]);

  useEffect(() => {
    if (session) localStorage.setItem("ttm_session", JSON.stringify(session));
    else localStorage.removeItem("ttm_session");
  }, [session]);

  useEffect(() => {
    if (!token) return;
    refreshAll();
  }, [token]);

  async function refreshAll(selectedId = project?.id) {
    setLoading(true);
    try {
      const [projectData, dashboardData] = await Promise.all([
        request("/projects", { token }),
        request("/dashboard", { token })
      ]);
      setProjects(projectData.projects);
      setDashboard(dashboardData);
      const id = selectedId || projectData.projects[0]?.id;
      if (id) await loadProject(id);
      else setProject(null);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProject(id) {
    const data = await request(`/projects/${id}`, { token });
    setProject(data.project);
  }

  async function submitAuth(event) {
    event.preventDefault();
    setMessage("");
    try {
      const path = authMode === "login" ? "/auth/login" : "/auth/signup";
      const body = authMode === "login"
        ? { email: authForm.email, password: authForm.password }
        : authForm;
      const data = await request(path, { method: "POST", body });
      setSession(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createProject(event) {
    event.preventDefault();
    setMessage("");
    try {
      const data = await request("/projects", { token, method: "POST", body: projectForm });
      setProjectForm({ name: "", description: "" });
      await refreshAll(data.project.id);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addMember(event) {
    event.preventDefault();
    setMessage("");
    try {
      await request(`/projects/${project.id}/members`, { token, method: "POST", body: memberForm });
      setMemberForm({ email: "", role: "MEMBER" });
      await loadProject(project.id);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createTask(event) {
    event.preventDefault();
    setMessage("");
    try {
      await request(`/projects/${project.id}/tasks`, {
        token,
        method: "POST",
        body: {
          ...taskForm,
          assigneeId: taskForm.assigneeId ? Number(taskForm.assigneeId) : null
        }
      });
      setTaskForm(emptyTask);
      await Promise.all([loadProject(project.id), refreshDashboard()]);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateTask(task, patch) {
    try {
      await request(`/projects/${project.id}/tasks/${task.id}`, {
        token,
        method: "PATCH",
        body: patch
      });
      await Promise.all([loadProject(project.id), refreshDashboard()]);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function refreshDashboard() {
    const data = await request("/dashboard", { token });
    setDashboard(data);
  }

  function logout() {
    setSession(null);
    setProjects([]);
    setProject(null);
    setDashboard(null);
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <h1>Team Task Manager</h1>
          <form onSubmit={submitAuth} className="auth-form">
            <div className="switcher">
              <button type="button" className={cx(authMode === "login" && "active")} onClick={() => setAuthMode("login")}>Login</button>
              <button type="button" className={cx(authMode === "signup" && "active")} onClick={() => setAuthMode("signup")}>Signup</button>
            </div>
            {authMode === "signup" && (
              <label>Name<input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} required /></label>
            )}
            <label>Email<input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required /></label>
            <label>Password<input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required minLength="6" /></label>
            <button className="primary" type="submit">{authMode === "login" ? "Login" : "Create account"}</button>
            {message && <p className="error">{message}</p>}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>TTM</span>
          <div>
            <strong>Task Manager</strong>
            <small>{session.user.name}</small>
          </div>
        </div>
        <form onSubmit={createProject} className="compact-form">
          <label>New project<input value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Project name" required /></label>
          <textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="Description" rows="3" />
          <button className="primary" type="submit">Create</button>
        </form>
        <nav className="project-list">
          {projects.map((item) => (
            <button key={item.id} className={cx(project?.id === item.id && "selected")} onClick={() => loadProject(item.id)}>
              <span>{item.name}</span>
              <small>{item.role}</small>
            </button>
          ))}
        </nav>
        <button className="ghost" onClick={logout}>Logout</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>{project?.name || "Create your first project"}</h2>
          </div>
          {loading && <span className="pill">Syncing</span>}
        </header>

        {dashboard && (
          <section className="metrics">
            <Metric label="Projects" value={dashboard.stats.projects} />
            <Metric label="Tasks" value={dashboard.stats.tasks} />
            <Metric label="Assigned to me" value={dashboard.stats.assignedToMe} />
            <Metric label="Overdue" value={dashboard.stats.overdue} tone={dashboard.stats.overdue ? "danger" : ""} />
          </section>
        )}

        {message && <p className="error inline">{message}</p>}

        {project ? (
          <div className="content-grid">
            <section className="main-column">
              <form onSubmit={createTask} className="task-composer">
                <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title" required />
                <textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Task details" rows="2" />
                <div className="form-row">
                  <select value={taskForm.assigneeId} onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {project.members.map((member) => (
                      <option key={member.user.id} value={member.user.id}>{member.user.name}</option>
                    ))}
                  </select>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                  <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                  <button className="primary" type="submit">Add task</button>
                </div>
              </form>

              <div className="board">
                {Object.entries(groupedTasks).map(([status, tasks]) => (
                  <section key={status} className="lane">
                    <h3>{status.replace("_", " ")} <span>{tasks.length}</span></h3>
                    {tasks.map((task) => (
                      <article key={task.id} className="task-card">
                        <div className="task-head">
                          <strong>{task.title}</strong>
                          <span className={cx("priority", task.priority.toLowerCase())}>{task.priority}</span>
                        </div>
                        {task.description && <p>{task.description}</p>}
                        <div className="task-meta">
                          <span>{task.assignee?.name || "Unassigned"}</span>
                          <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</span>
                        </div>
                        <select value={task.status} onChange={(e) => updateTask(task, { status: e.target.value })}>
                          <option value="TODO">Todo</option>
                          <option value="IN_PROGRESS">In progress</option>
                          <option value="DONE">Done</option>
                        </select>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            </section>

            <aside className="details">
              <section>
                <h3>Team</h3>
                <div className="member-list">
                  {project.members.map((member) => (
                    <div key={member.id}>
                      <span>{member.user.name}</span>
                      <small>{member.role}</small>
                    </div>
                  ))}
                </div>
              </section>
              {isAdmin && (
                <form onSubmit={addMember} className="compact-form">
                  <label>Add member by email<input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} required /></label>
                  <select value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button className="primary" type="submit">Invite / update</button>
                </form>
              )}
              <section>
                <h3>Status</h3>
                <div className="status-bars">
                  {dashboard && Object.entries(dashboard.stats.byStatus).map(([status, count]) => (
                    <div key={status}>
                      <span>{status.replace("_", " ")}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        ) : (
          <section className="empty-state">
            <h3>No projects yet</h3>
            <p>Create a project from the sidebar to start adding tasks and teammates.</p>
          </section>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value, tone }) {
  return (
    <article className={cx("metric", tone)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
