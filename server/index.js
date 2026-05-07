import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(500).optional().or(z.literal(""))
});

const memberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"])
});

const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().max(1000).optional().or(z.literal("")),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: z.string().optional().or(z.literal("")),
  assigneeId: z.number().int().positive().nullable().optional()
});

function tokenFor(user) {
  return jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function parseBody(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(", ");
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
  return parsed.data;
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Authentication required" });

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ message: "Invalid session" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid session" });
  }
}

async function getMembership(userId, projectId) {
  return prisma.projectMembership.findUnique({
    where: { userId_projectId: { userId, projectId } }
  });
}

async function requireProjectAccess(req, res, next) {
  const projectId = Number(req.params.projectId || req.params.id);
  const membership = await getMembership(req.user.id, projectId);
  if (!membership) return res.status(403).json({ message: "Project access denied" });
  req.projectId = projectId;
  req.membership = membership;
  next();
}

function requireAdmin(req, res, next) {
  if (req.membership?.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin role required" });
  }
  next();
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const data = parseBody(signupSchema, req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return res.status(409).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash }
    });

    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const data = parseBody(loginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/me", requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get("/api/projects", requireAuth, async (req, res) => {
  const memberships = await prisma.projectMembership.findMany({
    where: { userId: req.user.id },
    include: {
      project: {
        include: {
          memberships: { include: { user: true } },
          tasks: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({
    projects: memberships.map(({ role, project }) => ({
      ...project,
      role,
      members: project.memberships.map((membership) => ({
        id: membership.id,
        role: membership.role,
        user: publicUser(membership.user)
      })),
      memberships: undefined
    }))
  });
});

app.post("/api/projects", requireAuth, async (req, res, next) => {
  try {
    const data = parseBody(projectSchema, req.body);
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description || null,
        memberships: { create: { userId: req.user.id, role: "ADMIN" } }
      },
      include: {
        memberships: { include: { user: true } },
        tasks: true
      }
    });

    res.status(201).json({
      project: {
        ...project,
        role: "ADMIN",
        members: project.memberships.map((membership) => ({
          id: membership.id,
          role: membership.role,
          user: publicUser(membership.user)
        })),
        memberships: undefined
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects/:id", requireAuth, requireProjectAccess, async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.projectId },
    include: {
      memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
      tasks: {
        include: { assignee: true, creator: true },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }]
      }
    }
  });

  res.json({
    project: {
      ...project,
      role: req.membership.role,
      members: project.memberships.map((membership) => ({
        id: membership.id,
        role: membership.role,
        user: publicUser(membership.user)
      })),
      tasks: project.tasks.map((task) => ({
        ...task,
        assignee: task.assignee ? publicUser(task.assignee) : null,
        creator: publicUser(task.creator)
      })),
      memberships: undefined
    }
  });
});

app.post("/api/projects/:projectId/members", requireAuth, requireProjectAccess, requireAdmin, async (req, res, next) => {
  try {
    const data = parseBody(memberSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(404).json({ message: "No user found with that email" });

    const membership = await prisma.projectMembership.upsert({
      where: { userId_projectId: { userId: user.id, projectId: req.projectId } },
      update: { role: data.role },
      create: { userId: user.id, projectId: req.projectId, role: data.role },
      include: { user: true }
    });

    res.status(201).json({
      member: { id: membership.id, role: membership.role, user: publicUser(membership.user) }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects/:projectId/tasks", requireAuth, requireProjectAccess, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: req.projectId },
    include: { assignee: true, creator: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }]
  });

  res.json({
    tasks: tasks.map((task) => ({
      ...task,
      assignee: task.assignee ? publicUser(task.assignee) : null,
      creator: publicUser(task.creator)
    }))
  });
});

app.post("/api/projects/:projectId/tasks", requireAuth, requireProjectAccess, async (req, res, next) => {
  try {
    const data = parseBody(taskSchema, req.body);

    if (data.assigneeId) {
      const assigneeMembership = await getMembership(data.assigneeId, req.projectId);
      if (!assigneeMembership) {
        return res.status(400).json({ message: "Assignee must be a project member" });
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assigneeId: data.assigneeId || null,
        creatorId: req.user.id,
        projectId: req.projectId
      },
      include: { assignee: true, creator: true }
    });

    res.status(201).json({
      task: {
        ...task,
        assignee: task.assignee ? publicUser(task.assignee) : null,
        creator: publicUser(task.creator)
      }
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/projects/:projectId/tasks/:taskId", requireAuth, requireProjectAccess, async (req, res, next) => {
  try {
    const taskId = Number(req.params.taskId);
    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing || existing.projectId !== req.projectId) {
      return res.status(404).json({ message: "Task not found" });
    }

    const data = parseBody(taskSchema.partial(), req.body);
    if (data.assigneeId) {
      const assigneeMembership = await getMembership(data.assigneeId, req.projectId);
      if (!assigneeMembership) {
        return res.status(400).json({ message: "Assignee must be a project member" });
      }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId || null } : {})
      },
      include: { assignee: true, creator: true }
    });

    res.json({
      task: {
        ...task,
        assignee: task.assignee ? publicUser(task.assignee) : null,
        creator: publicUser(task.creator)
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard", requireAuth, async (req, res) => {
  const memberships = await prisma.projectMembership.findMany({
    where: { userId: req.user.id },
    select: { projectId: true }
  });
  const projectIds = memberships.map((membership) => membership.projectId);
  const tasks = await prisma.task.findMany({
    where: { projectId: { in: projectIds } },
    include: { project: true, assignee: true },
    orderBy: { dueDate: "asc" }
  });

  const now = new Date();
  const assignedToMe = tasks.filter((task) => task.assigneeId === req.user.id);
  const overdue = tasks.filter((task) => task.dueDate && task.dueDate < now && task.status !== "DONE");
  const byStatus = {
    TODO: tasks.filter((task) => task.status === "TODO").length,
    IN_PROGRESS: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    DONE: tasks.filter((task) => task.status === "DONE").length
  };

  res.json({
    stats: {
      projects: projectIds.length,
      tasks: tasks.length,
      assignedToMe: assignedToMe.length,
      overdue: overdue.length,
      byStatus
    },
    upcoming: tasks.slice(0, 6).map((task) => ({
      ...task,
      assignee: task.assignee ? publicUser(task.assignee) : null
    }))
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || "Something went wrong" });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, () => {
    console.log(`Team Task Manager running on port ${PORT}`);
  });
}

export default app;