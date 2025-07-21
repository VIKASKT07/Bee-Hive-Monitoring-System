# model.py
from pandas import to_datetime
from datetime import datetime, timedelta
import pandas as pd 
from sklearn.linear_model import LinearRegression

THRESHOLD = 1000          # ppm at which you call it a “leak”

class GasPredictor:
    """
    * Retrains automatically every N new rows (default 20).
    * Uses simple Linear Regression on time → value.
    * Returns ETA (hours) until threshold & expected value at that time.
    """
    def __init__(self, retrain_every: int = 20):
        self.retrain_every = retrain_every
        self.model = LinearRegression()
        self._row_count_at_last_train = 0
        self.is_trained = False

    # ------------------------------------------------------------------
    def _prepare(self, rows):
        """Return X (= hours since first) and y arrays for sklearn."""
        recent_rows = rows[:30] + rows[61:] 
        recent_rows = [r for r in recent_rows if r[1] < 1800]  # lose the 2047 ppm spike
        # recent_rows.sort(key=lambda r: r[2])
        cleaned = []
        for r in recent_rows:
            if isinstance(r, (tuple, list)) and len(r) == 2:
                cleaned.append((r[0], r[1]))
            else:                        # r is a GasEvent or has attrs
                cleaned.append((r.ts, r.value))

        if len(cleaned) < 2:            # need ≥2 points to train
            print("⚠️  Not enough data to train.")
            return None, None
        
        
        
        df = pd.DataFrame(cleaned, columns=["ts", "value"])
        df["ts"] = pd.to_datetime(df["ts"])
        self.t0 = df["ts"].iloc[0]

        df["hours"] = (df["ts"] - self.t0).dt.total_seconds() / 3600

        df['value'] =df['value'].rolling(window =10 , min_periods=1).mean()

        X = df[["hours"]].values
        y = df["value"].values
        return X, y

    # ------------------------------------------------------------------
    def maybe_retrain(self, rows):
        """Retrain if enough new data has arrived."""
        if len(rows) - self._row_count_at_last_train >= self.retrain_every:
            X, y= self._prepare(rows)
            self.model.fit(X, y)
            self._row_count_at_last_train = len(rows)
            self.is_trained = True
            print(f"[Predictor] retrained on {len(rows)} rows")

    # ------------------------------------------------------------------
    def eta_hours(self, last_ts):
        """Hours from last_ts until value is expected to hit THRESHOLD."""
        if not self.is_trained:
            print("🚫 Model not trained yet.")
            return None   # not enough data yet
        
        if isinstance(last_ts, str):
            last_ts = to_datetime(last_ts)  # ✅ Convert string to datetime
        
        m = self.model.coef_[0]
        c = self.model.intercept_
        print(f"📈 Model: y = {m:.3f}x + {c:.3f}")

        # if m <= 0:        # flat or falling line → no leak predicted
        #     print("📉 No rising trend (m <= 0)")
        #     return None
        
        hours_since_t0 = (last_ts - self.t0).total_seconds() / 3600
        hours_to_threshold = (THRESHOLD - c) / m - hours_since_t0
        print(f"⏳ Hours to threshold: {hours_to_threshold:.2f}")

        return max(hours_to_threshold, 0)

    # ------------------------------------------------------------------
    def expected_value(self, ts):
        """Predict gas value at any datetime."""
        if not self.is_trained:
            return None
        h = (ts - self.t0).total_seconds() / 3600
        return float(self.model.predict([[h]])[0])
