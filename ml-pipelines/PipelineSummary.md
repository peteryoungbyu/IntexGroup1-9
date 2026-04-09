# ML Pipeline Summary — Lighthouse for Life

Six end-to-end machine learning pipelines built on real Lighthouse data. Each follows the full IS 455 lifecycle: Problem Framing → Data Acquisition & Exploration → Feature Engineering → Modeling → Evaluation → Deployment.

---

## Quick Reference

| Pipeline | Business Question | Model Type | Key Metric | App Integration |
|---|---|---|---|---
| 01 Donor Churn | Which donors will lapse? | Classification | ROC-AUC, Avg Precision | Admin donor retention dashboard |
| 02 Reintegration Readiness | Which residents are ready to reintegrate? | Classification | ROC-AUC | Resident case management view |
| 03 Donor Upsell | Which donors will upgrade their gift? | Classification | Avg Precision | Admin donor upgrade queue |
| 04 Intervention Effectiveness | Which plans are at risk of not completing? | Classification | ROC-AUC, Recall | Case manager plan alert system |
| 05 Social Media Donations | Which posts drive donations? | Classification + Regression | Avg Precision | Social media analytics dashboard |
| 06 Resident Risk | Which residents are regressing? | Regression + Classification | R², ROC-AUC | Resident morning priority queue |

---

## Pipeline 01 — Donor Churn Prediction

**File**: `01_donor_churn_real.ipynb`
**Model artifact**: `models/donor_churn_model.pkl`

### Business Problem
Donor acquisition is far more expensive than retention. Development staff need an early-warning system to identify donors likely to lapse in the next 180 days so they can intervene with targeted outreach before the donor is lost.

### Data
Joins `supporters` (donor profile) and `donations` (transaction history). Uses a **monthly snapshot methodology** — each donor generates multiple labeled training rows across their giving lifecycle, not just one row. This dramatically improves dataset size and model stability.

### Key Findings
- **Recency dominates**: Days since last gift is the single strongest churn predictor. Donors inactive 90+ days are at immediate risk.
- **Downward trajectories are leading indicators**: Declining donation amounts and counts in the trailing 180 days precede churn by weeks or months — actionable before the donor fully lapses.
- **Recurring donors churn at far lower rates**: Converting a one-time donor to a recurring gift reduces churn risk substantially.
- **Cadence instability is a warning sign**: Donors with inconsistent giving intervals (high variance in days between gifts) drift into churn more readily than steady givers.
- **Model performance**: ROC-AUC ~0.80+, Average Precision well above the naive baseline churn rate.

### App Integration
- Scores written nightly to `dbo.supporters` (`likely_churn`, `churn_risk_tier`)
- **Admin donor management page**: Sortable retention table filtered by risk tier
  - 🔴 High risk (≥ 0.60): immediate personal outreach
  - 🟡 Medium (0.35–0.59): email stewardship campaign
  - 🟢 Low (< 0.35): standard communications
- API: `POST /api/ml/donor-churn`

### Why It Matters for the App
Development staff currently have no systematic way to identify at-risk donors before they lapse. This pipeline transforms the donor list from a static table into a live priority queue, enabling the small Lighthouse development team to focus their limited outreach capacity where it will have the highest retention impact.

---

## Pipeline 02 — Reintegration Readiness

**File**: `02_reintegration_readiness_real.ipynb`
**Model artifact**: `models/reintegration_readiness_model.pkl`

### Business Problem
Reintegration is the ultimate goal of the Lighthouse program — returning residents to safe, stable, independent lives. But reintegration too early carries serious safety risks. Case managers need a data-informed assessment of which residents are genuinely ready, backed by signals across health, education, behavioral stability, and family support.

### Data
Seven-table join across `residents`, `education_records`, `health_outcomes`, `incident_reports`, `intervention_plans`, `home_visitation_reports`, and `counseling_recordings`. One row per resident, aggregated to a resident-level feature vector.

### Key Findings
- **Readiness is multidimensional**: No single service type predicts reintegration — it requires simultaneous progress across health, education, behavioral stability, and home environment.
- **Education completion is a strong signal**: Residents who complete vocational or academic programs are more prepared for independence.
- **Low incident recency matters**: Residents with extended behavioral stability periods (low incident count, long time since last incident) show higher readiness.
- **Home visit quality counts**: Positive home environment assessments predict successful reintegration more than simply having had visits.
- **Important caveat**: Dataset is small (single organization). This model is a decision-support prototype — it surfaces data patterns to assist case managers, not replace their judgment.

### App Integration
- **Resident case management dashboard**: Reintegration readiness score displayed alongside each resident's profile
- Color-coded readiness indicator for program directors
- API: `POST /api/ml/reintegration-readiness`

### Why It Matters for the App
Case managers currently rely on subjective assessment and institutional knowledge. This pipeline provides a consistent, data-backed second opinion that synthesizes signals across all seven data domains — helping surface residents who may be ready earlier than expected, or flag residents who appear stable in one area but are struggling in others.

---

## Pipeline 03 — Donor Upsell Prediction

**File**: `03_donor_upsell_real.ipynb`
**Model artifact**: `models/donor_upsell_model.pkl`

### Business Problem
Not every donor should receive the same ask. A donor making their first 500 PHP gift needs a different stewardship strategy than a loyal donor who has been gradually increasing their giving. The development team needs a ranked list of donors who are primed to make a significantly larger gift — defined as at least 1.25× their current amount AND at least 250 PHP more in absolute terms.

### Data
Joins `supporters`, `donations`, and `social_media_posts`. Uses the same snapshot methodology as Pipeline 01 — multiple labeled training rows per donor across their giving history.

### Key Findings
- **Gift growth momentum is the strongest predictor**: Donors whose last gift exceeded their previous gift are the highest-probability upgrade candidates. They are already on an upward trajectory.
- **Absolute giving level matters**: Donors with higher baseline averages have both more financial capacity and more demonstrated commitment.
- **Frequency signals commitment**: Donors who give 3+ times per year are significantly more likely to upgrade than occasional givers.
- **Social mission connection helps**: Donors who engage with Lighthouse social media posts are more likely to upgrade — possibly reflecting deeper mission alignment.
- **Model performance**: ROC-AUC ~0.84, Average Precision ~0.896. At a 0.30 threshold, precision ~0.78 — of every 10 flagged donors, ~8 actually make a larger gift.

### App Integration
- Scores written to `dbo.supporters` (`upgrade_probability`, `upgrade_flag`) alongside churn scores
- **Admin donor management page**: Two-dimensional donor view combining churn + upgrade scores:
  - High churn + low upgrade → retention focus
  - Low churn + high upgrade → major gift ask
  - Both high → blended re-engagement + upgrade ask
- API: `POST /api/ml/donor-upsell`

### Why It Matters for the App
The donor management page gains a second intelligence layer. Rather than treating all donors the same, development staff can segment their outreach strategy in one view — knowing simultaneously which donors are at risk of leaving and which are ready for a larger ask. This transforms the donor table into an action-oriented fundraising tool.

---

## Pipeline 04 — Intervention Plan Effectiveness

**File**: `04_intervention_effectiveness_real.ipynb`
**Model artifact**: `models/intervention_effectiveness_model.pkl`

### Business Problem
Intervention plans are the primary structured mechanism through which Lighthouse delivers services — counseling, education, health support, and home visits. When a plan is not completed, the resident may leave the program without the full benefit of services. Case managers need early warning to adjust at-risk plans before residents disengage.

### Data
Five-table join: `intervention_plans` (unit of analysis), `counseling_recordings`, `education_records`, `health_outcomes`, and `home_visits`. All service features computed strictly within the plan's active window (leakage prevention).

### Key Findings
- **Service intensity predicts completion**: Plans with more frequent counseling sessions and consistent education engagement are significantly more likely to complete.
- **Session recency is a disengagement signal**: A large gap between the last counseling session and the plan end date is a strong warning sign — residents who disengage from counseling tend to disengage from the plan entirely.
- **Multi-dimensional engagement matters**: Plans where residents are active across multiple services (counseling + education + health check-ins) complete at higher rates than those where engagement is concentrated in one area.
- **Critical causal caveat**: Service intensity and plan completion may both be caused by underlying resident readiness — a resident who is motivated and stable attends more sessions AND is more likely to complete. The model identifies signals, not causes.
- **Error cost**: Missing an at-risk plan (FN) is far more costly than a false alarm (FP). Threshold is set to maximize recall.

### App Integration
- **Case manager view**: Risk badge (🔴 At Risk / 🟢 On Track) alongside each active intervention plan
- Alert workflow: At-risk plans trigger automatic notification to the assigned case manager
- API: `POST /api/ml/intervention-risk`

### Why It Matters for the App
Case managers oversee multiple active plans simultaneously. Without a systematic signal, at-risk plans may not surface until a resident has already disengaged. This pipeline adds a real-time early warning layer to the intervention plan management interface — allowing proactive rather than reactive case management.

---

## Pipeline 05 — Social Media Donation Prediction

**File**: `05_social_media_donations_real.ipynb`
**Model artifacts**: `models/social_media_classifier.pkl`, `models/social_media_regressor.pkl`

### Business Problem
Lighthouse has limited social media promotion budget and communications staff time. Not all posts are equal — some generate donor engagement and actual gifts; others create impressions without translating to revenue. The team needs to know which posts to boost, what content formats to replicate, and how to prioritize limited promotional spend.

### Data
Three-table join: `social_media_posts` (~812 rows), `donations`, and `supporters`. Target constructed by linking posts to donations within an attribution window.

### Two-Stage Model
1. **Classification**: Will this post generate a donation? (binary — drives promotion decision)
2. **Regression**: If it converts, how much will it generate? (continuous — drives prioritization)
3. **Priority score** = P(conversion) × E(amount) — ranks posts by expected fundraising value

### Key Findings
- **Shares matter more than likes**: Organic shares extend reach to new audiences and carry an implicit endorsement signal. They are far more predictive of donation conversion than like counts alone.
- **Direct fundraising appeals outperform indirect content**: Posts that explicitly ask for donations convert at higher rates than awareness or impact content — even though the latter may generate more engagement.
- **Visual content (image/video) drives conversions**: Posts with media attachments consistently outperform text-only posts.
- **Platform differences are significant**: Different platforms attract different donor demographics and have meaningfully different conversion rates.
- **Content quality confound**: High-quality posts generate both organic engagement AND donations — both are downstream of content quality. Artificially boosting a low-quality post to increase share count will not replicate the conversion rates of organically high-performing content.

### App Integration
- **Social media analytics dashboard**: Ranked list of recent posts by priority score
- **Pre-publish scoring**: Staff drafting a new post can input content characteristics to receive a predicted conversion score before publishing
- API: `POST /api/ml/social-media-score` → returns `conversion_probability`, `expected_donation_amount`, `priority_score`

### Why It Matters for the App
Lighthouse's social media presence is both a fundraising and awareness tool. This pipeline turns the social media dashboard from a passive reporting view into an active decision-support system — helping communications staff allocate promotional budget toward highest-impact content and learn over time which content types resonate most with their donor audience.

---

## Pipeline 06 — Resident Regression Risk

**File**: `06_resident_risk_regression_real.ipynb`
**Model artifacts**: `models/resident_risk_regressor.pkl`, `models/resident_risk_classifier.pkl`

### Business Problem
Residents at Lighthouse do not all progress on the same trajectory. Some stabilize; others experience setbacks — behavioral incidents, health crises, education disengagement — that signal deterioration toward their pre-admission risk state. Identifying these residents early, before a crisis occurs, allows staff to intervene with additional support rather than reacting after the fact.

### Data
The most complex pipeline: seven-table join across `residents`, `health_outcomes`, `education_records`, `incident_reports`, `home_visitation_reports`, `counseling_recordings`, and `intervention_plans`. Uses an **anchor date design** — features are computed from history before the anchor; the regression target is built from outcomes after the anchor. This mirrors real deployment and prevents leakage.

### Two-Stage Model
1. **Regression**: Composite risk score (0–100) built from post-anchor outcome severity across health, incidents, education disengagement, counseling absence, and home visit deterioration
2. **Classification**: Binary high-risk flag for residents in the top quartile of the regression score

### Key Findings
- **Admission risk level is a powerful baseline**: Residents admitted at Critical or High risk have systematically higher regression scores — the model must be evaluated against this baseline, not zero.
- **Recent incidents are the strongest dynamic signal**: Post-admission behavioral incidents, especially recent high-severity ones, are the leading indicator of further regression.
- **Counseling session gaps are early warning**: A long gap between the last counseling session and the anchor date consistently precedes regression — disengagement from therapy precedes broader behavioral deterioration.
- **Risk is multidimensional**: No single table predicts regression reliably. The seven-table join is necessary — residents can be deteriorating in health while appearing stable in education, or vice versa.
- **Critical causal caveat**: Complex cases receive intensive services AND have high regression risk — both driven by underlying case complexity. Do NOT interpret high service intensity as a cause of regression. High predicted risk is a signal to provide more support, not to question existing services.
- **Model performance**: Regression R² meaningful given a noisy composite target; Classifier ROC-AUC ≥ 0.75 target enables reliable prioritization.

### App Integration
- **Nightly batch scoring**: All active residents scored nightly; scores written to `dbo.residents` (`risk_score`, `high_risk_flag`)
- **Resident management dashboard**: Color-coded risk badge (🔴 High / 🟡 Moderate / 🟢 Low) per resident
- **Morning priority queue**: High-risk residents surface at top of case manager's daily view
- API: `POST /api/ml/resident-risk` → returns `risk_score`, `high_risk_flag`, `risk_percentile`

### Why It Matters for the App
This pipeline is the most operationally urgent of the six. Case managers currently have no systematic way to compare regression risk across their entire resident caseload simultaneously. The morning priority queue transforms the resident list from a static roster into a daily action plan — surfacing the residents who need immediate attention before a crisis forces a reactive response.

---

## 455 Rubric Checklist

All six pipelines satisfy the full IS 455 lifecycle requirements:

| Rubric Stage | Implementation Across All Pipelines |
|---|---|
| **Problem Framing** | Business question, stakeholder identification, predictive vs. explanatory justification, success metrics, and error cost asymmetry stated in each notebook |
| **Data Acquisition & Preparation** | Multi-table joins documented with merge logic; missing value strategy explained; reproducible sklearn `Pipeline` objects used throughout |
| **Exploration** | Distributions, class balance, feature-outcome relationships examined and plotted before modeling in every pipeline |
| **Modeling & Feature Selection** | 2–3 candidate models compared per pipeline; balanced class weights applied; feature selection justified by domain reasoning |
| **Evaluation & Selection** | Train/test splits (time-based where appropriate, stratified otherwise); cross-validation for small datasets; results interpreted in business terms, not just metric values |
| **Causal & Relationship Analysis** | Every pipeline includes explicit section distinguishing correlation from causation, identifying confounders, and stating what causal claims can and cannot be made |
| **Deployment & Integration** | Model artifact saved with preprocessing pipeline; API endpoint defined; dashboard integration described; retraining cadence specified |

### Variety of Approaches Across Pipelines
- **Predictive classification**: Pipelines 01, 02, 03, 04
- **Two-stage classification + regression**: Pipeline 05 (social media priority score)
- **Regression + classification**: Pipeline 06 (continuous risk score + binary flag)
- **Snapshot/longitudinal design**: Pipelines 01, 03 (donor snapshots)
- **Anchor date design**: Pipeline 06 (resident risk)
- **Plan-window design**: Pipeline 04 (service features within active window)
- **Models used**: Logistic Regression, Random Forest, Extra Trees, Gradient Boosting

---

## Cross-Pipeline Architecture

### Three Stakeholder Groups

| Stakeholder | Pipelines | Primary App Surface |
|---|---|---|
| **Development / Fundraising staff** | 01 (Churn), 03 (Upsell), 05 (Social Media) | Admin donor management + social analytics |
| **Case managers** | 02 (Reintegration), 04 (Intervention), 06 (Risk) | Resident dashboard + morning priority queue |
| **Program directors / Leadership** | 02, 04, 06 | Aggregate dashboards + funder reporting |

### Shared API Pattern
All six pipelines follow `POST /api/ml/[pipeline-name]` returning a probability score + actionable flag, making them straightforward to integrate with the existing ASP.NET Core backend.

### Retraining Schedule
| Frequency | Pipelines |
|---|---|
| Monthly | 01 (Donor Churn), 03 (Donor Upsell), 05 (Social Media) |
| Quarterly | 02 (Reintegration), 04 (Intervention), 06 (Resident Risk) |
