Team Task Manager

Full-stack web app where users create projects, assign tasks, and track progress with role-based access (ADMIN / MEMBER).

Requirement Coverage:
- Authentication: signup and login with JWT
- Project and team management
- Task creation, assignment, and status tracking
- Dashboard with task counts, status split, and overdue metrics
- REST API with validation and relational database models
- Role-based access control for project operations

Tech Stack:
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma ORM
- Authentication: JWT + bcrypt
- Validation: Zod

Local Setup:
1. npm install
2. copy .env.example .env
3. npm run db:push
4. npm run dev

Optional demo data:
- npm run db:seed

Demo credentials after seed:
- Admin: admin@example.com / password123
- Member: member@example.com / password123

Vercel Deployment:
1. Push repository to GitHub.
2. Import project in Vercel.
3. Add environment variables:
   - DATABASE_URL
   - JWT_SECRET
4. Deploy and verify signup/login, project creation, member add, task updates, and dashboard.

Submission:
- Live URL: Vercel deployment URL
- GitHub Repo: https://github.com/AmoolyaSuneja/TaskManager
- README .txt: upload README.txt
- Demo Video: 2-5 minutes
