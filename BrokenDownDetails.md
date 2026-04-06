Here's the complete, updated product backlog:

IS 401 – Project Management and Systems Design
Recommend and finalize organization name — First order of business; choose a name for the new nonprofit.
Copy and set up FigJam board — Make a copy of the provided FigJam board and submit the link through Learning Suite.
Define organization branding — Logo concept and visual identity to use across the app.
Create customer personas — Two detailed personas (e.g., donor and caseworker) with goals, pain points, and justification for why they're the most important.
Build journey maps — Map current-state user journeys for both personas, identifying friction and pain points.
Write problem statement — Clearly articulate the specific problem the product solves.
Complete MoSCoW table — All requirements categorized, at least five nice-to-haves, one feature you chose NOT to build with justification.
Identify Scrum Master and Product Owner — Assign roles on the FigJam board.
Set up product backlog — Clear product goal, at least 12 backlog cards.
Set up burndown chart — Configure to track all progress throughout the week; update daily.
Create Figma wireframes — Wireframes for three most important screens in desktop view.
Sprint planning — Monday — Sprint goal, at least 8 cards with point estimates and one assignee each. Screenshot before starting work.
Sprint planning — Tuesday — Sprint goal, at least 8 cards with point estimates and one assignee each. Screenshot before starting work.
Sprint planning — Wednesday — Sprint goal, at least 8 cards with point estimates and one assignee each. Screenshot before starting work.
Sprint planning — Thursday — Sprint goal, at least 8 cards with point estimates and one assignee each. Screenshot before starting work.
Generate three AI UI design options — Three distinct designs, three screenshots each (9 total), five feedback questions per design, summarize takeaways.
Make and justify design decision — Select a design, write justification paragraph, list three changes made to the original AI output.
Create tech stack diagram — Diagram with logos for frontend, backend, and database technologies.
Capture current-state screenshots — At least five pages in both desktop and mobile views.
Conduct user feedback session — Show site to a real person fitting a persona, watch them use it, document five specific planned changes.
Define and display OKR metric — Track one meaningful metric in the app and explain why it's the most important measure of success.
Achieve Lighthouse accessibility score ≥ 90% — On every page.
Ensure responsiveness — Every page resizes appropriately for desktop and mobile.
Conduct retrospective — Each member writes 2 going well, 2 could be better, and personal greatest contribution. Team reflects on solution quality.
Prepare presentation — Outline, demo script, and rehearsal for the 20-minute business presentation + tech demo.
Deliver presentation — Present to judging panel on Friday.

IS 413 – Enterprise Application Development
Set up project scaffolding — Initialize .NET 10 backend, React/TypeScript (Vite) frontend, and connect to chosen database.
Design and deploy relational database — Create schema from CSV data with good normalization principles, deploy to cloud.
Import and transform CSV data — Load all 17 CSV files into the database, apply any needed transformations or modifications.
Build Home/Landing Page — Modern, professional page introducing the org's mission with clear calls to action.
Build Impact/Donor-Facing Dashboard — Aggregated, anonymized visualizations showing outcomes, progress, and resource use.
Build Login Page — Username/password authentication with validation and error handling.
Build Privacy Policy + Cookie Consent page — GDPR-compliant privacy policy linked from footer, cookie consent notification.
Build Admin Dashboard — Command center: active residents across safehouses, recent donations, upcoming case conferences, summarized progress data.
Build Donors & Contributions page — CRUD for supporter profiles (type, status), track all contribution types (monetary, in-kind, time, skills, social media), view donation allocations by safehouse and program area.
Build Caseload Inventory page — Core case management: resident profiles, demographics, case categories/sub-categories, disability info, family socio-demographic profile, admission details, referral info, social worker assignments, reintegration tracking. Filtering and search by case status, safehouse, category, and other fields.
Build Process Recording page — Forms for dated counseling session notes: session date, social worker, session type (individual/group), emotional state, narrative summary, interventions applied, follow-up actions. Chronological history per resident.
Build Home Visitation & Case Conferences page — Log visits (type: initial assessment, routine follow-up, reintegration assessment, post-placement monitoring, emergency), observations, family cooperation level, safety concerns, follow-up actions. View case conference history and upcoming conferences per resident.
Build Reports & Analytics page — Donation trends over time, resident outcome metrics (education, health), safehouse performance comparisons, reintegration success rates. Align with Annual Accomplishment Report format (services provided, beneficiary counts, program outcomes).
Build Social Media Management/Analytics page — Support social media strategy features, engagement tracking, and integration with ML pipeline outputs.
Build Partners Management page — View and manage in-country partners and organizations as needed.
Build any additional supporting pages — Pages needed for security, outreach, or other cross-cutting requirements.
Implement data validation and error handling — Input validation on all forms, graceful error messages, robust API error responses.
Implement pagination, search, and filtering — Across all list/table views.
Ensure responsive design — Every page works on desktop and mobile.
Achieve Lighthouse accessibility score ≥ 90% — On every page.
Deploy full application to cloud — Frontend, backend, and database deployed (Azure recommended).
Polish UI details — Titles, icons, logos, consistent look and feel, loading states, speed optimization, finishing touches.
Record IS 413 video walkthrough — Demonstrate all IS 413 requirements clearly and concisely.

IS 414 – Security
Enable HTTPS/TLS — Valid certificate on all public connections; subdomain with cloud-provided cert is acceptable.
Redirect HTTP to HTTPS — Automatic redirect for all traffic.
Implement username/password authentication — ASP.NET Identity (or equivalent) with full login flow.
Configure strong password policy — Stricter than default PasswordOptions, per class instruction (not per Microsoft docs or AI suggestions).
Protect API endpoints — All CUD endpoints and sensitive read endpoints require authentication/authorization; login and auth/me remain open. When in doubt, maximally restrictive.
Implement role-based access control (RBAC) — Admin role for CUD operations, donor role for personal donation history and impact, unauthenticated access for public pages (homepage, privacy policy, etc.).
Require delete confirmation — Confirmation dialog before any data deletion.
Secure credentials — Use .env file, secrets manager, or environment variables. Nothing in code or public repos.
Create GDPR privacy policy — Tailored to the organization, linked from footer (at minimum on home page).
Implement functional cookie consent — GDPR-compliant; clearly document in video whether cosmetic or fully functional.
Set Content-Security-Policy header — Properly scoped CSP as an HTTP header (not a meta tag), visible in browser dev tools.
Deploy site publicly — Accessible via public URL.
Create grading user accounts — Admin without MFA, donor without MFA (connected to historical donations), and one account with MFA enabled.
(Additional) Add third-party authentication — e.g., Google OAuth or another provider.
(Additional) Add multi-factor authentication — With MFA-free accounts preserved for grading.
(Additional) Enable HSTS — HTTP Strict Transport Security.
(Additional) Implement browser-accessible cookie for user setting — e.g., dark/light mode preference that React reads and applies.
(Additional) Add data sanitization/encoding — Prevent injection attacks on incoming data or rendered output.
(Additional) Deploy databases to real DBMS — Not SQLite for operational or identity databases.
(Additional) Deploy using Docker containers — Instead of simply deploying to a VM.
Record IS 414 video walkthrough — Demonstrate every security feature clearly; undocumented features won't receive points.

IS 455 – Machine Learning
Pipeline 1: Donor Churn Prediction — Predict which donors are at risk of lapsing. Full pipeline with both a predictive model (classification) and an explanatory/causal model. Deploy as a dashboard indicator or API endpoint.
Pipeline 2: Donor Upsell/Upgrade Model — Predict which donors might give more if asked and explain what factors drive higher giving. Both causal and predictive models. Deploy as ranked list or recommendation in admin portal.
Pipeline 3: Resident Reintegration Readiness — Predict when a resident may be ready for reintegration based on counseling, education, health, and intervention data. Both causal and predictive models. Deploy as readiness score on caseload inventory page.
Pipeline 4: Intervention Effectiveness — Examine which interventions are associated with better outcomes. Both causal (OLS regression with careful discussion) and predictive models. Display feature importances and recommendations in reports/analytics.
Pipeline 5: Social Media Engagement → Donations — Analyze which content types, posting times, and platforms drive actual donations vs. just engagement. Both causal and predictive models. Deploy as posting recommendations or dashboard.
Pipeline 6: Resident Risk of Regression — Predict which residents may be struggling or at risk based on process recordings, incident reports, and health/wellbeing data. Both causal and predictive models. Deploy as alert/flag in case management system.
Create .ipynb notebook for each pipeline — Each notebook must include all six required sections: Problem Framing, Data Prep & Exploration, Modeling & Feature Selection, Evaluation & Interpretation, Causal and Relationship Analysis, Deployment Notes. Each must be fully executable top-to-bottom.
Integrate ML outputs into web app — Predictions, scores, dashboards, or interactive tools visible to users in the deployed application.
Record IS 455 video walkthrough — Demonstrate all ML pipelines and their integration into the app.

Cross-Cutting / Final Deliverables
Submit final deliverable via Qualtrics — Correct group info, website URL, GitHub repo (public, correct branch), .ipynb file links, video links, and login credentials. No typos.
Complete peer evaluation — Due Friday April 10 at 11:59 PM via the provided Qualtrics link. Required to receive a grade.
Verify all URLs and credentials — Test every submitted link and login before submission.




