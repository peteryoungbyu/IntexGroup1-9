import argparse
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn

from pythondbconnection import importTableFromDb, update_supporter_likely_churn


def load_model_bundle(model_path: Path) -> dict:
    """Load model payload and raise a clear error when sklearn versions are incompatible."""
    try:
        with open(model_path, "rb") as f:
            return pickle.load(f)
    except Exception as exc:
        message = str(exc)
        if "_RemainderColsList" in message or "InconsistentVersionWarning" in message:
            raise RuntimeError(
                "Model bundle is incompatible with the installed scikit-learn version. "
                "This model was likely trained with scikit-learn 1.6.1 while the current "
                f"environment is {sklearn.__version__}. "
                "Fix options: (1) install scikit-learn==1.6.1 in this environment, or "
                "(2) retrain and re-save the model bundle using the currently installed version."
            ) from exc
        raise


def build_latest_snapshot_dataset(
    donations_df: pd.DataFrame,
    supporters_df: pd.DataFrame,
    as_of_date: pd.Timestamp,
    min_history_days: int = 30,
) -> pd.DataFrame:
    """Build one latest feature row per supporter at a single as_of_date."""
    donations_df = donations_df.sort_values(["supporter_id", "donation_date"]).copy()

    rows = []

    for supporter_id, grp in donations_df.groupby("supporter_id"):
        grp = grp.sort_values("donation_date").copy()

        first_donation = grp["donation_date"].min()
        past = grp[grp["donation_date"] <= as_of_date].copy()

        if past.empty:
            continue

        if (as_of_date - first_donation).days < min_history_days:
            continue

        donation_dates = past["donation_date"].sort_values()
        amounts = past["amount"].fillna(0).astype(float)

        recent_30 = past[past["donation_date"] > as_of_date - pd.Timedelta(days=30)]
        recent_90 = past[past["donation_date"] > as_of_date - pd.Timedelta(days=90)]
        recent_180 = past[past["donation_date"] > as_of_date - pd.Timedelta(days=180)]
        recent_365 = past[past["donation_date"] > as_of_date - pd.Timedelta(days=365)]
        prev_180 = past[
            (past["donation_date"] <= as_of_date - pd.Timedelta(days=180))
            & (past["donation_date"] > as_of_date - pd.Timedelta(days=360))
        ]
        prev_365 = past[
            (past["donation_date"] <= as_of_date - pd.Timedelta(days=365))
            & (past["donation_date"] > as_of_date - pd.Timedelta(days=730))
        ]

        gaps = donation_dates.diff().dt.days.dropna()
        tenure_days = max((as_of_date - donation_dates.min()).days, 1)
        n_total = len(past)

        amount_total = float(amounts.sum())
        amount_mean = float(amounts.mean())
        amount_std = float(amounts.std(ddof=0)) if len(amounts) > 1 else 0.0

        amt_30 = float(recent_30["amount"].fillna(0).sum())
        amt_90 = float(recent_90["amount"].fillna(0).sum())
        amt_180 = float(recent_180["amount"].fillna(0).sum())
        amt_365 = float(recent_365["amount"].fillna(0).sum())
        amt_prev_180 = float(prev_180["amount"].fillna(0).sum())
        amt_prev_365 = float(prev_365["amount"].fillna(0).sum())

        cnt_30 = len(recent_30)
        cnt_90 = len(recent_90)
        cnt_180 = len(recent_180)
        cnt_365 = len(recent_365)
        cnt_prev_180 = len(prev_180)
        cnt_prev_365 = len(prev_365)

        overall_avg_amount = amount_total / max(n_total, 1)
        recent_avg_amount_180 = amt_180 / max(cnt_180, 1)
        recent_avg_amount_90 = amt_90 / max(cnt_90, 1)

        avg_gap = gaps.mean() if len(gaps) > 0 else np.nan
        std_gap = gaps.std(ddof=0) if len(gaps) > 1 else np.nan

        row = {
            "supporter_id": int(supporter_id),
            "as_of_date": as_of_date,
            "recency_days": (as_of_date - donation_dates.max()).days,
            "tenure_days": tenure_days,
            "n_donations_total": n_total,
            "amount_total": amount_total,
            "amount_mean": amount_mean,
            "amount_median": float(amounts.median()),
            "amount_std": amount_std,
            "amount_cv": amount_std / max(amount_mean, 1e-6),
            "amount_max": float(amounts.max()),
            "amount_min": float(amounts.min()),
            "donations_last_30d": cnt_30,
            "donations_last_90d": cnt_90,
            "donations_last_180d": cnt_180,
            "donations_last_365d": cnt_365,
            "amount_last_30d": amt_30,
            "amount_last_90d": amt_90,
            "amount_last_180d": amt_180,
            "amount_last_365d": amt_365,
            "donation_count_trend_180": cnt_180 - cnt_prev_180,
            "amount_trend_180": amt_180 - amt_prev_180,
            "donation_count_trend_365": cnt_365 - cnt_prev_365,
            "amount_trend_365": amt_365 - amt_prev_365,
            "recent_avg_amount_90": recent_avg_amount_90,
            "recent_avg_amount_180": recent_avg_amount_180,
            "overall_avg_amount": overall_avg_amount,
            "avg_amount_ratio_180_to_overall": recent_avg_amount_180 / max(overall_avg_amount, 1e-6),
            "avg_amount_ratio_90_to_overall": recent_avg_amount_90 / max(overall_avg_amount, 1e-6),
            "days_between_mean": avg_gap,
            "days_between_std": std_gap,
            "days_between_cv": std_gap / max(avg_gap, 1e-6) if pd.notna(avg_gap) and pd.notna(std_gap) else np.nan,
            "donations_per_30d": n_total / max(tenure_days / 30.0, 1e-6),
            "avg_days_between_proxy": tenure_days / max(n_total - 1, 1),
            "is_recurring_share": past["is_recurring"].fillna(False).astype(int).mean(),
            "recency_to_tenure_ratio": ((as_of_date - donation_dates.max()).days) / max(tenure_days, 1),
            "share_donations_last_180d": cnt_180 / max(n_total, 1),
            "share_amount_last_180d": amt_180 / max(amount_total, 1e-6),
            "share_donations_last_365d": cnt_365 / max(n_total, 1),
            "share_amount_last_365d": amt_365 / max(amount_total, 1e-6),
            "campaign_nunique": past["campaign_name"].nunique(dropna=True),
            "channel_nunique": past["channel_source"].nunique(dropna=True),
            "used_referral_share": past["referral_post_id"].notna().mean(),
            "donation_type_mode": past["donation_type"].mode().iloc[0] if past["donation_type"].notna().any() else "Unknown",
            "channel_source_mode": past["channel_source"].mode().iloc[0] if past["channel_source"].notna().any() else "Unknown",
        }

        rows.append(row)

    snapshots = pd.DataFrame(rows)
    if snapshots.empty:
        return snapshots

    static = supporters_df.copy()
    reference_date = pd.Timestamp("2025-09-01")
    static["supporter_age_days_at_reference"] = (reference_date - static["created_at"]).dt.days
    static["days_to_first_donation"] = (static["first_donation_date"] - static["created_at"]).dt.days

    keep_cols = [
        "supporter_id",
        "supporter_type",
        "relationship_type",
        "region",
        "country",
        "status",
        "acquisition_channel",
        "supporter_age_days_at_reference",
        "days_to_first_donation",
    ]

    snapshots = snapshots.merge(static[keep_cols], on="supporter_id", how="left")
    return snapshots


def run_inference_and_write(model_path: Path, as_of_date: pd.Timestamp) -> int:
    payload = load_model_bundle(model_path)

    model = payload["model"]
    selected_features = payload["features"]
    threshold = float(payload.get("threshold", 0.5))

    supporters = importTableFromDb("dbo.supporters")
    donations = importTableFromDb("dbo.donations")

    supporters["created_at"] = pd.to_datetime(supporters["created_at"], errors="coerce")
    supporters["first_donation_date"] = pd.to_datetime(supporters["first_donation_date"], errors="coerce")
    donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")

    snapshots = build_latest_snapshot_dataset(donations, supporters, as_of_date=as_of_date)
    if snapshots.empty:
        print("No eligible supporter rows found for inference.")
        return 0

    features = snapshots.copy()
    for col in selected_features:
        if col not in features.columns:
            features[col] = np.nan

    X = features[selected_features].copy()
    probs = model.predict_proba(X)[:, 1]

    updates = snapshots[["supporter_id"]].copy()
    updates["churn_probability"] = np.round(probs, 3)
    updates["likely_churn"] = updates["churn_probability"] >= threshold

    rows_updated = update_supporter_likely_churn(
        updates[["supporter_id", "churn_probability", "likely_churn"]]
    )

    print(f"As-of date: {as_of_date.date()}")
    print(f"Threshold: {threshold}")
    print(f"Updated rows: {rows_updated}")
    print(updates[["supporter_id", "churn_probability", "likely_churn"]].head(10))

    return rows_updated


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run donor churn model inference and write predictions to dbo.supporters."
    )
    parser.add_argument(
        "--model-path",
        default="models/donor_churn_model.pkl",
        help="Path to saved donor churn model bundle.",
    )
    parser.add_argument(
        "--as-of-date",
        default=None,
        help="As-of date for feature generation (YYYY-MM-DD). Defaults to today.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    model_path = Path(args.model_path)

    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    as_of_date = pd.Timestamp.today().normalize()
    if args.as_of_date:
        as_of_date = pd.Timestamp(args.as_of_date)

    run_inference_and_write(model_path=model_path, as_of_date=as_of_date)


if __name__ == "__main__":
    main()
