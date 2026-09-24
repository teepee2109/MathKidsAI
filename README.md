# MathKids --- Smart Math Learning Platform

> **MathKids** là nền tảng web học Toán thông minh dành cho học sinh
> tiểu học lớp 1--5, tập trung vào cá nhân hóa lộ trình học bằng AI và
> kết hợp học tập với trò chơi.

------------------------------------------------------------------------

## 1. Project Overview

MathKids hỗ trợ học sinh:

-   Kiểm tra năng lực Toán đầu vào.
-   Phân tích điểm mạnh và điểm yếu theo từng nhóm kiến thức.
-   Tạo lộ trình học cá nhân hóa.
-   Học bài và làm bài tập theo nhiều mức độ.
-   Tự động điều chỉnh độ khó dựa trên kết quả học.
-   Ôn tập lại những dạng bài thường sai.
-   Học Toán thông qua trò chơi.
-   Nhận XP, sao và huy hiệu.
-   Theo dõi tiến độ học tập.

Hệ thống cũng hỗ trợ phụ huynh/giáo viên theo dõi quá trình học của học
sinh thông qua báo cáo, cảnh báo và gợi ý hỗ trợ.

------------------------------------------------------------------------

# 2. Target Users

## 2.1. Student

Học sinh lớp 1--5 là người sử dụng chính của hệ thống.

Student có thể:

-   Đăng ký/đăng nhập.
-   Làm bài kiểm tra năng lực đầu vào.
-   Xem kết quả đánh giá.
-   Xem lộ trình học cá nhân hóa.
-   Học bài.
-   Làm bài tập.
-   Nhận kết quả và điểm.
-   Ôn tập chủ đề yếu.
-   Chơi game Toán.
-   Nhận XP, sao, huy hiệu.
-   Xem thành tích.
-   Xem bảng xếp hạng.
-   Xem tiến độ học tập.

## 2.2. Parent

Phụ huynh sử dụng hệ thống để theo dõi việc học của con.

Có thể:

-   Quản lý/liên kết tài khoản của trẻ.
-   Xem số bài đã hoàn thành.
-   Xem thời gian học.
-   Xem tỷ lệ đúng/sai.
-   Xem các chủ đề con còn yếu.
-   Nhận cảnh báo học tập.
-   Xem gợi ý hỗ trợ do hệ thống/AI tạo ra.

## 2.3. Admin

Admin là vai trò cần thiết nếu triển khai website hoàn chỉnh, nhưng tài
liệu dự án hiện chưa đặc tả chi tiết nghiệp vụ Admin.

Các chức năng quản trị cụ thể cần được nhóm xác nhận trước khi đưa vào
MVP.

------------------------------------------------------------------------

# 3. Core Business Flow

Đây là nghiệp vụ trung tâm của MathKids:

``` text
Student
   |
   v
Placement Test
   |
   v
AI analyzes learning ability
   |
   +----> Strengths
   |
   +----> Weaknesses
   |
   v
Personalized Learning Path
   |
   v
Learn + Exercise + Game
   |
   v
Learning Result
   |
   v
AI re-analyzes performance
   |
   +---- Good performance ----> Increase difficulty
   |
   +---- Poor performance ---> Decrease difficulty
   |                             + Review basics
   |
   v
Update Learning Progress
   |
   +----> Student Dashboard
   |
   +----> Parent Report
   |
   +----> Learning Alert
```

------------------------------------------------------------------------

# 4. Functional Requirements

## FR-01 --- User Authentication

System should support basic account operations:

-   Register.
-   Login.
-   Logout.
-   Manage user profile.

> Authentication details such as email/password rules, password recovery
> and social login are not specified in the project document and must be
> decided separately.

------------------------------------------------------------------------

## FR-02 --- Placement Test

When a student starts using MathKids, the system provides an initial
test appropriate to the student's age and grade.

The system should:

1.  Display placement-test questions.
2.  Allow the student to answer questions.
3.  Submit the test.
4.  Calculate the result.
5.  Analyze ability by knowledge group.
6.  Identify strengths.
7.  Identify weaknesses.

Knowledge groups mentioned in the project include:

-   Addition/subtraction.
-   Multiplication/division.
-   Geometry.
-   Measurement.
-   Word problems.

------------------------------------------------------------------------

## FR-03 --- Student Ability Analysis

The system analyzes placement-test and learning results to determine the
student's current ability.

The analysis should identify:

-   Strong topics.
-   Weak topics.
-   Frequently incorrect question types.
-   Learning performance.

The exact AI model and scoring algorithm are implementation decisions
and are not specified by the project document.

------------------------------------------------------------------------

## FR-04 --- Personalized Learning Path

The system automatically creates a learning plan based on the student's
current ability.

The plan can be organized by:

-   Day.
-   Week.
-   Month.

The learning content should be divided into levels from basic to
advanced.

------------------------------------------------------------------------

## FR-05 --- Adaptive Difficulty

The system adjusts exercise difficulty based on student performance.

Expected behavior:

``` text
Many correct answers
        |
        v
Increase difficulty


Many incorrect answers
        |
        v
Decrease difficulty
        |
        v
Recommend reviewing foundational content
```

The exact thresholds for "many correct" and "many incorrect" must be
defined during implementation.

------------------------------------------------------------------------

## FR-06 --- Smart Review

The system should detect topics or question types that the student
frequently gets wrong.

It should then:

-   Identify weak content.
-   Recommend review content.
-   Provide review exercises.
-   Update the student's progress after review.

------------------------------------------------------------------------

## FR-07 --- Lessons

Students should be able to:

-   View available lessons.
-   Select a topic.
-   Select an appropriate difficulty level.
-   Open a lesson.
-   Complete the lesson.
-   Record completion status.

Lesson structure and exact educational content are not specified in the
source document and must be designed by the team.

------------------------------------------------------------------------

## FR-08 --- Exercises / Questions

Students should be able to:

-   View exercises.
-   Answer questions.
-   Submit answers.
-   Receive results.
-   Record learning results.

The system should store enough information to support progress analysis.

------------------------------------------------------------------------

## FR-09 --- Math Games

MathKids should support learning through interactive games.

Examples specified in the project:

-   Quick calculation.
-   Match the result.
-   Math obstacle game.
-   Rescue a character by answering math questions.

The exact game mechanics are implementation decisions.

------------------------------------------------------------------------

## FR-10 --- Reward System

Students can receive rewards after learning activities.

Reward types specified in the project:

-   Stars.
-   Badges.
-   Experience points (XP).

The system should:

-   Calculate earned XP.
-   Grant rewards.
-   Unlock badges.
-   Display achievements.
-   Store achievement history.

------------------------------------------------------------------------

## FR-11 --- Leaderboard

The system may provide a friendly leaderboard allowing students to
compare results with friends in a class or learning group.

The leaderboard should be designed to encourage learning and avoid
excessive competitive pressure.

Exact ranking rules are not specified in the source and must be decided
by the team.

------------------------------------------------------------------------

## FR-12 --- Student Progress

The system should track student learning progress.

Important progress information includes:

-   Number of completed lessons.
-   Study time.
-   Correct/incorrect rate.
-   Weak topics.
-   Exercise results.
-   Game results.
-   XP/rewards.

------------------------------------------------------------------------

## FR-13 --- Parent Learning Report

Parents should be able to view:

-   Number of completed exercises/lessons.
-   Study time.
-   Correct/incorrect rate.
-   Weak topics.

The report should present information in an understandable form.

------------------------------------------------------------------------

## FR-14 --- Learning Alerts

The system should notify parents when:

-   The student does not study regularly.
-   The student repeatedly performs poorly in a question type/topic.
-   The student needs to review old knowledge.

The exact notification channel is not specified and can be decided
later.

------------------------------------------------------------------------

## FR-15 --- Parent Recommendations

The system/AI can provide recommendations to parents based on the
student's learning status.

Examples from the project:

-   Practice multiplication tables.
-   Practice word problems.
-   Adjust study time to avoid overload.

------------------------------------------------------------------------

# 5. Business Model

MathKids uses a **Freemium** model.

The source document describes:

### Free

Basic learning functions and a limited amount of learning content.

### Premium

Paid monthly or yearly access to advanced functions.

The source specifically lists Premium benefits such as:

-   AI personalized learning path.
-   Detailed learning ability reports.
-   Periodic tests and review recommendations.
-   Advanced math games.

> **Important:** Another part of the project notes mentions Free,
> Advance and VIP. The detailed monetization section describes Free and
> Premium. The team must finalize the actual package structure before
> implementing the subscription module.

------------------------------------------------------------------------

# 6. MVP Scope

The first MVP should prioritize the core learning loop:

``` text
1. Landing Page
2. Student account
3. Grade/class selection
4. Placement Test
5. Ability Analysis
6. Lesson
7. Question / Exercise
8. Score calculation
9. Save learning result
10. Learning Level
11. Reward / Badge
12. Basic Game
13. Student Progress
14. Parent Report
15. Basic AI integration
```

Features such as advanced teacher management, advanced administration,
complex payment flows and a large game library should only be added
after the core learning flow works.

------------------------------------------------------------------------

# 7. Technical Requirements

## 7.1. Frontend

### React

React is used to build the web user interface.

Recommended setup:

``` text
React
Vite
JavaScript
React Router
Axios
```

Responsibilities:

-   Render pages.
-   Handle user interaction.
-   Manage frontend state.
-   Call backend APIs.
-   Display learning content.
-   Display progress/rewards.
-   Display games.

------------------------------------------------------------------------

## 7.2. Backend

### Node.js + Express.js

Recommended:

``` text
Node.js
Express.js
JavaScript
REST API
```

Responsibilities:

-   Authentication.
-   Business logic.
-   Lesson API.
-   Question/Exercise API.
-   Learning result API.
-   Game API.
-   Reward API.
-   Progress API.
-   Parent report API.
-   AI API integration.
-   Payment integration.

------------------------------------------------------------------------

## 7.3. Database

### Development

``` text
SQL Server Local
```

### Production

``` text
Azure SQL Database
```

The database stores:

-   Users.
-   Students.
-   Parents.
-   Lessons.
-   Topics.
-   Questions.
-   Exercises.
-   Placement tests.
-   Test results.
-   Learning paths.
-   Learning progress.
-   Game results.
-   Rewards.
-   Badges.
-   Notifications.
-   Reports.
-   Subscriptions/payments if the Premium module is implemented.

------------------------------------------------------------------------

## 7.4. ORM

### Prisma

Prisma is proposed as the ORM between Node.js and SQL Server.

``` text
Node.js
   |
Prisma
   |
SQL Server
```

Responsibilities:

-   Query database.
-   Insert data.
-   Update data.
-   Delete data.
-   Define database models.
-   Manage migrations.

------------------------------------------------------------------------

## 7.5. AI

### OpenAI API

AI can be integrated into the backend to support:

-   Student ability analysis.
-   Weak-topic identification.
-   Personalized learning recommendations.
-   Learning-path generation.
-   Difficulty adjustment.
-   Review recommendations.
-   Parent recommendations.

Architecture:

``` text
React
   |
   v
Node.js API
   |
   v
AI Service
   |
   v
OpenAI API
```

**The OpenAI API key must remain on the backend and must not be exposed
in React/browser code.**

------------------------------------------------------------------------

## 7.6. Game

### Phaser.js

Phaser.js is proposed for lightweight 2D math games.

``` text
React
   |
   +---- Normal learning UI
   |
   +---- Phaser game
```

The source project explicitly proposes interactive math games, but does
not prescribe a specific game engine. Phaser is therefore a technology
recommendation, not a source requirement.

------------------------------------------------------------------------

## 7.7. Payment

### SePay

If the Premium subscription is implemented, SePay can be integrated as
the payment service.

Recommended flow:

``` text
React
   |
   v
Backend
   |
   v
Payment Service
   |
   v
Payment Result
   |
   v
Update Subscription
```

Payment details should be finalized before implementation.

------------------------------------------------------------------------

# 8. Recommended Architecture

``` text
                    ┌──────────────────────┐
                    │       Browser        │
                    │                      │
                    │ React + Vite         │
                    │ React Router         │
                    │ Axios                │
                    └──────────┬───────────┘
                               │
                         HTTP / REST
                               │
                               v
                    ┌──────────────────────┐
                    │      Backend         │
                    │                      │
                    │ Node.js              │
                    │ Express.js           │
                    │ REST API             │
                    └──────┬───────┬───────┘
                           │       │
                 ┌─────────┘       └─────────┐
                 v                           v
        ┌─────────────────┐         ┌─────────────────┐
        │    Database     │         │    AI Service   │
        │                 │         │                 │
        │ SQL Server      │         │ OpenAI API      │
        │ Azure SQL       │         │                 │
        └─────────────────┘         └─────────────────┘
```

------------------------------------------------------------------------

# 9. Suggested Frontend Structure

``` text
src/
│
├── assets/
│
├── components/
│   ├── common/
│   ├── layout/
│   ├── lesson/
│   ├── exercise/
│   ├── game/
│   ├── progress/
│   └── reward/
│
├── pages/
│   ├── auth/
│   ├── student/
│   ├── parent/
│   └── common/
│
├── services/
│   ├── api.js
│   ├── authService.js
│   ├── lessonService.js
│   ├── exerciseService.js
│   ├── gameService.js
│   ├── studentService.js
│   ├── parentService.js
│   └── aiService.js
│
├── context/
│   └── AuthContext.jsx
│
├── routes/
│   └── AppRoutes.jsx
│
├── App.jsx
└── main.jsx
```

------------------------------------------------------------------------

# 10. Suggested Backend Structure

``` text
src/
│
├── controllers/
│   ├── authController.js
│   ├── studentController.js
│   ├── lessonController.js
│   ├── exerciseController.js
│   ├── gameController.js
│   ├── rewardController.js
│   ├── progressController.js
│   ├── parentController.js
│   ├── aiController.js
│   └── paymentController.js
│
├── services/
│   ├── authService.js
│   ├── lessonService.js
│   ├── exerciseService.js
│   ├── gameService.js
│   ├── progressService.js
│   ├── aiService.js
│   └── paymentService.js
│
├── routes/
│   ├── authRoutes.js
│   ├── lessonRoutes.js
│   ├── exerciseRoutes.js
│   ├── gameRoutes.js
│   ├── progressRoutes.js
│   ├── parentRoutes.js
│   └── aiRoutes.js
│
├── middleware/
│
├── prisma/
│   └── schema.prisma
│
├── app.js
└── server.js
```

------------------------------------------------------------------------

# 11. Initial API Design

## Authentication

``` http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

## Student

``` http
GET  /api/students/:id
GET  /api/students/:id/progress
```

## Placement Test

``` http
GET  /api/placement-test
POST /api/placement-test/submit
GET  /api/placement-test/result/:studentId
```

## Learning Path

``` http
GET /api/learning-path/:studentId
```

## Lessons

``` http
GET /api/lessons
GET /api/lessons/:id
```

## Exercises

``` http
GET  /api/exercises
GET  /api/exercises/:id
POST /api/exercises/:id/submit
```

## Games

``` http
GET  /api/games
POST /api/games/:id/start
POST /api/games/:id/submit
```

## Rewards

``` http
GET /api/rewards/:studentId
```

## Parent

``` http
GET /api/parents/:id/children
GET /api/parents/:id/report
GET /api/parents/:id/alerts
GET /api/parents/:id/recommendations
```

## AI

``` http
POST /api/ai/analyze
GET  /api/ai/recommendations/:studentId
GET  /api/ai/review-plan/:studentId
```

------------------------------------------------------------------------

# 12. Development Environment

Recommended tools:

  Tool                           Purpose
  ------------------------------ ------------------------
  VS Code                        Code editor
  Node.js                        JavaScript runtime
  npm                            Package manager
  Git                            Version control
  GitHub                         Source code repository
  SQL Server                     Local database
  SQL Server Management Studio   Database management
  Postman                        API testing
  Chrome DevTools                Frontend debugging

------------------------------------------------------------------------

# 13. Deployment

Recommended MVP deployment:

``` text
GitHub
   |
   +------------------+
   |                  |
   v                  v
Vercel             Azure
   |                  |
   v                  v
React              Node.js API
                      |
                      v
                 Azure SQL
```

AI and payment services are accessed from the backend.

------------------------------------------------------------------------

# 14. Development Principles

## 14.1. Frontend does not access database directly

Correct:

``` text
React
  ↓
REST API
  ↓
Backend
  ↓
Database
```

Incorrect:

``` text
React
  ↓
SQL Server
```

## 14.2. API keys stay on backend

For example:

``` text
OPENAI_API_KEY=...
```

must not be placed directly inside React source code.

## 14.3. Start with MVP

Do not implement every possible feature at the beginning.

Priority:

``` text
Placement Test
      ↓
Analysis
      ↓
Learning Path
      ↓
Lesson
      ↓
Exercise
      ↓
Result
      ↓
Progress
```

Then add:

``` text
Game
Reward
Parent Report
AI Recommendation
Premium
```

------------------------------------------------------------------------

# 15. Important Scope Decisions Before Coding

The following points are **not fully specified in the source document**
and must be agreed by the team:

1.  Exact user roles and permissions.
2.  Teacher feature set.
3.  Admin feature set.
4.  Exact Free/Premium package structure.
5.  Pricing.
6.  Authentication method.
7.  Exact AI model and prompts.
8.  Algorithm/threshold for increasing or decreasing difficulty.
9.  Exact database schema.
10. Payment workflow.
11. Notification channel.
12. Exact game mechanics.
13. Exact lesson/question content.
14. Deployment configuration.
15. Privacy and child-data handling requirements.

These should be treated as project decisions, not assumptions.

------------------------------------------------------------------------

# 16. MVP Technology Stack --- Final

``` text
Frontend
├── React
├── Vite
├── JavaScript
├── React Router
└── Axios

Backend
├── Node.js
├── Express.js
└── REST API

Database
├── SQL Server
├── Azure SQL
└── Prisma ORM

AI
└── OpenAI API

Game
└── Phaser.js

Payment
└── SePay

Development
├── VS Code
├── Git
├── GitHub
└── Postman

Deployment
├── Vercel
├── Azure App Service
└── Azure SQL
```

------------------------------------------------------------------------

# 17. Project Definition in One Sentence

**MathKids is a web-based personalized mathematics learning platform for
primary-school students that uses AI to assess learning ability,
generate and adapt personalized learning paths, provide interactive
exercises and games, track progress, and help parents monitor and
support their children's learning.**
