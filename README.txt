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

Vercel Deployment:
1. Push this repository to GitHub.
2. Add environment variables in Vercel:
   DATABASE_URL=<your-database-url>
   JWT_SECRET=use-a-long-random-secret
3. Deploy the project on Vercel using the existing repository.
4. Vercel will build the frontend and expose API routes under /api/* using api/[...path].js.
5. Open the deployed Vercel URL and test signup/login.

Note: For production on Vercel, use an external database connection rather than SQLite, since Vercel functions run in a read-only environment and don't preserve a local SQLite file.

Submission Checklist:
- Live Application URL: Vercel deployment URL
- GitHub Repository Link: GitHub repo URL
- README file: upload this README.txt file
- Demo Video: 2 to 5 minute walkthrough showing signup/login, project creation, adding a member, creating/assigning tasks, changing status, and dashboard metrics
