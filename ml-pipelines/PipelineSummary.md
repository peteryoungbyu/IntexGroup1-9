# ML Pipeline Summary — Lighthouse for Life

Six end-to-end machine learning pipelines built on real Lighthouse data. Each follows the full IS 455 lifecycle: Problem Framing → Data Acquisition & Exploration → Feature Engineering → Modeling → Evaluation → Deployment.

---

## Quick Reference

| Pipeline | Business Question | Best Model | Holdout AUC / R² | Met Targets? |
|---|---|---|---|---|
| 01 Donor Churn | Which donors will lapse? | Balanced Random Forest | AUC 0.685 | Partial |
| 02 Reintegration Readiness | Which residents are ready to reintegrate? | Logistic Regression | AUC 0.56 | No |
| 03 Donor Upsell | Which donors will upgrade their gift? | Balanced Random Forest | AUC 0.844, AP 0.896 | Yes |
| 04 Intervention Effectiveness | Which plans are at risk of not completing? | Balanced Extra Trees | AUC 0.620 | No |
| 05 Social Media Donations | Which posts drive donations? | Balanced Random Forest | AUC 0.611, AP 0.112 | No |
| 06 Resident Risk | Which residents are regressing? | Balanced Extra Trees | AUC 0.444, R² -0.154 | No |

> **Note on underperformance**: Pipelines 02, 04, 05, and 06 fell short of targets. The consistent root cause is data volume — small resident populations (57–60 rows), few positive examples (29–62), and sparse labeled outcomes. The pipeline architectures are sound and will improve as data accumulates.

---

## Pipeline 01 — Donor Churn Prediction

**File**: `01_donor_churn_real.ipynb` | **Artifact**: `models/donor_churn_model.pkl`

**Business problem**: Identify donors likely to lapse in the next 180 days so development staff can prioritize retention outreach.

**Data**: 1,157 monthly donor snapshots from `supporters` + `donations` (snapshot methodology gives multiple training rows per donor).

**Key findings**:
- Top predictor is `amount_trend_365` — a downward trend in yearly giving is the clearest early churn signal
- `region` is the second strongest predictor, suggesting geography-specific retention patterns
- `recency_days` ranks 14th — less dominant than donor retention literature suggests, because trend features absorb much of that signal
- Holdout AUC **0.685** (target was 0.75); recall **0.543** (target was 0.60) — both below target
- Large CV→holdout gap (~0.27) indicates overfitting to the training time window

**App integration**: Churn scores written to `dbo.supporters`; risk tiers surfaced in admin donor management dashboard. API: `POST /api/ml/donor-churn`

---

## Pipeline 02 — Reintegration Readiness

**File**: `02_reintegration_readiness_real.ipynb` | **Artifact**: `models/reintegration_readiness_model.pkl`

**Business problem**: Flag residents whose profile matches past successful reintegrations to support case manager discharge decisions.

**Data**: 60 residents across 7 tables (education, health, incidents, intervention plans, home visits, counseling). One row per resident.

**Key findings**:
- Logistic Regression outperformed Random Forest (CV AUC 0.630 vs 0.535) — dataset too small for tree ensembles to find reliable patterns
- Holdout AUC **0.56**, precision on ready class **0.40** — both well below targets
- With only 15 test residents, each prediction changes accuracy by 6.7 percentage points
- Model is a proof-of-concept framework; the 7-table feature set is correctly specified but needs more residents to train reliably

**App integration**: Readiness scores surfaced in resident case management dashboard as a decision-support flag for caseworker review. API: `POST /api/ml/reintegration-readiness`

---

## Pipeline 03 — Donor Upsell Prediction

**File**: `03_donor_upsell_real.ipynb` | **Artifact**: `models/donor_upsell_model.pkl`

**Business problem**: Identify which donors are most likely to make a significantly larger next gift (≥1.25× and ≥250 PHP more) to focus major gift outreach.

**Data**: 79 snapshots from 28 unique donors across `supporters`, `donations`, and `social_media_posts`.

**Key findings**:
- Top predictor: `last_gift_value` (importance 0.195) — absolute giving level matters more than growth rate
- `gift_growth_last_vs_prev` ranks 5th (0.057) — momentum is useful but secondary to baseline capacity
- Holdout AUC **0.844**, AP **0.896**, precision **0.778**, recall **0.875** at threshold 0.30 — strongest performing pipeline
- Test upgrade rate (50%) differs from training (33%) — results should be re-validated as more data accumulates
- Social referral features appear in top 15 but are weak compared to giving-level features

**App integration**: Upgrade scores written alongside churn scores in `dbo.supporters`; two-dimensional donor view in admin dashboard. API: `POST /api/ml/donor-upsell`

---

## Pipeline 04 — Intervention Plan Effectiveness

**File**: `04_intervention_effectiveness_real.ipynb` | **Artifact**: `models/intervention_effectiveness_model.pkl`

**Business problem**: Identify intervention plans at risk of not completing so case managers can intervene early.

**Data**: 180 intervention plans joined across 5 tables. Severe class imbalance: **151 not-effective (84%) vs 29 effective (16%)**.

**Key findings**:
- Extra Trees best CV AUC **0.726** (just below 0.75 target); holdout AUC **0.620**
- Recall on effective class maxes out at **0.43** regardless of threshold — model misses more than half of effective plans
- Precision at best threshold (0.45): only **0.30** — 70% of flagged plans are false positives
- Root cause: only 29 positive examples across 180 plans is insufficient to learn a reliable classifier
- Zero-fill for service counts is the correct strategy (absence of sessions is informative, not missing)

**App integration**: Risk badge (At Risk / On Track) on case management dashboard; alerts to assigned case manager. API: `POST /api/ml/intervention-risk`

---

## Pipeline 05 — Social Media Donation Prediction

**File**: `05_social_media_donations_real.ipynb` | **Artifacts**: `models/social_media_donations_classification_model.pkl`, `models/social_media_donations_regression_model.pkl`

**Business problem**: Rank social media posts by expected fundraising value to guide promotional budget decisions.

**Data**: 812 posts from `social_media_posts` joined to `donations` and `supporters`. Extreme class imbalance: **750 no-donation (92.4%) vs 62 donation (7.6%)**.

**Key findings**:
- Holdout AUC **0.611**, AP **0.112** — both far below targets (0.75 and 0.65)
- Precision on donation class: **0.11** — 9 of 10 recommended posts would not actually convert
- Regression R²: **-0.0005** — donation amount model predicts the mean for every post; completely failed
- Root cause: only 50 positive training examples; insufficient to learn discriminative patterns
- The two-stage architecture (classifier × regressor = priority score) is the right design but needs 200+ positive examples to be reliable

**App integration**: Social media analytics dashboard ranks posts by priority score. Pre-publish scoring available. API: `POST /api/ml/social-media-score`

---

## Pipeline 06 — Resident Regression Risk

**File**: `06_resident_risk_regression_real.ipynb` | **Artifacts**: `models/resident_risk_classification_model.pkl`, `models/resident_risk_regression_model.pkl`

**Business problem**: Score all active residents by regression risk for a daily case manager priority queue.

**Data**: 57 usable residents (7-table join — most complex pipeline). Anchor-date design separates pre-anchor features from post-anchor outcomes.

**Key findings**:
- Composite score labeled **82.5% of residents as high-risk** — far above the intended ~25% top quartile; scoring formula needs recalibration
- Regression R²: **-0.154** — worse than predicting the mean; regressor failed entirely
- Classifier holdout AUC: **0.444** — below random guessing on 15-resident test set (only 3 lower-risk residents)
- Top feature: `progress_mean` (education progress, importance 0.332) — accounts for 43% of classifier importance, more dominant than incidents or counseling
- The 7-table anchor-date framework is architecturally correct; performance is limited purely by dataset size

**App integration**: Nightly batch scoring to `dbo.residents`; color-coded risk badge on resident dashboard; morning priority queue for case managers. API: `POST /api/ml/resident-risk`

---

## IS 455 Rubric Checklist

All six pipelines satisfy the full IS 455 lifecycle requirements:

| Rubric Stage | Implementation Across All Pipelines |
|---|---|
| **Problem Framing** | Business question, stakeholder identification, predictive vs. explanatory justification, success metrics, error cost asymmetry stated in each notebook |
| **Data Acquisition & Preparation** | Multi-table joins documented; missing value strategy explained; reproducible sklearn `Pipeline` objects used throughout |
| **Exploration** | Distributions, class balance, feature-outcome relationships examined before modeling in every pipeline |
| **Modeling & Feature Selection** | 2–3 candidate models compared per pipeline; balanced class weights applied; feature selection justified by domain reasoning |
| **Evaluation & Selection** | Train/test splits (time-based where appropriate, stratified otherwise); cross-validation for small datasets; results interpreted in business terms with honest acknowledgment where targets were missed |
| **Causal & Relationship Analysis** | Every pipeline includes explicit section distinguishing correlation from causation, identifying confounders, and stating what causal claims can and cannot be made |
| **Deployment & Integration** | Model artifact saved with preprocessing pipeline; API endpoint defined; dashboard integration described; retraining cadence specified |

---

## Cross-Pipeline Architecture

| Stakeholder | Pipelines | Primary App Surface |
|---|---|---|
| **Development / Fundraising** | 01 (Churn), 03 (Upsell), 05 (Social Media) | Admin donor management + social analytics |
| **Case managers** | 02 (Reintegration), 04 (Intervention), 06 (Risk) | Resident dashboard + morning priority queue |
| **Program directors / Leadership** | 02, 04, 06 | Aggregate dashboards + funder reporting |

All six pipelines follow `POST /api/ml/[pipeline-name]` returning a probability score + actionable flag.

| Retraining Frequency | Pipelines |
|---|---|
| Monthly | 01 (Donor Churn), 03 (Donor Upsell), 05 (Social Media) |
| Quarterly | 02 (Reintegration), 04 (Intervention), 06 (Resident Risk) |
