Team Task Manager

A full-stack task management app for creating projects, adding teammates, assigning work, and tracking delivery status with Admin/Member role-based access.

Features:
- Signup and login with JWT authentication
- Project creation and project-scoped team membership
- Admin-only member invitation and role updates
- Task creation, assignment, priority, due date, and status tracking
- Dashboard metrics for projects, tasks, assigned work, overdue work, and task status
- REST API with validation and relational database models
- Railway-ready deployment configuration

Tech Stack:
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite with Prisma ORM
- Auth: JWT + bcrypt password hashing
- Validation: Zod

Local Setup:
1. npm install
2. Copy .env.example to .env
3. npm run db:push
4. Optional demo data: npm run db:seed
5. npm run dev

Demo Login after seeding:
- Admin: admin@example.com
- Member: member@example.com
- Password: password123

API Overview:
- POST /api/auth/signup
- POST /api/auth/login
- GET /api/me
- GET /api/dashboard
- GET /api/projects
- POST /api/projects
- GET /api/projects/:id
- POST /api/projects/:projectId/members
- GET /api/projects/:projectId/tasks
- POST /api/projects/:projectId/tasks
- PATCH /api/projects/:projectId/tasks/:taskId

Role-Based Access:
- Only authenticated users can access projects, tasks, and dashboards.
- Users only see projects where they are members.
- Admins can add members or update member roles.
- Members can create and update tasks inside projects they belong to.

Railway Deployment:
1. Push this repository to GitHub.
2. Create a new Railway project and connect the GitHub repository.
3. Add environment variables:
   DATABASE_URL=file:./prod.db
   JWT_SECRET=use-a-long-random-secret
4. Railway uses railway.json to run install, database push, build, and start commands.
5. Open the generated Railway domain and test signup/login.

Submission Checklist:
- Live Application URL: Railway public URL
- GitHub Repository Link: GitHub repo URL
- README file: upload this README.txt file
- Demo Video: 2 to 5 minute walkthrough showing signup/login, project creation, adding a member, creating/assigning tasks, changing status, and dashboard metrics
