from __future__ import annotations

import logging
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

from app.config import ALERT_NEGATIVE_THRESHOLD

logger = logging.getLogger(__name__)


class TrendAnalyzer:
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self.df["timestamp"] = pd.to_datetime(self.df["timestamp"], utc=True, errors="coerce")

    def sentiment_over_time(self, freq: str = "D") -> list[dict]:
        grouped = self.df.set_index("timestamp").resample(freq)
        result = []
        for period, group in grouped:
            if len(group) == 0:
                continue
            counts = group["sentiment_label"].value_counts()
            total = len(group)
            result.append({
                "period": period.isoformat(),
                "total": total,
                "positive": int(counts.get("positive", 0)),
                "negative": int(counts.get("negative", 0)),
                "neutral": int(counts.get("neutral", 0)),
                "positive_ratio": round(counts.get("positive", 0) / total, 4),
                "negative_ratio": round(counts.get("negative", 0) / total, 4),
                "avg_vader_score": round(float(group["vader_score"].mean()), 4) if "vader_score" in group else 0,
            })
        return result

    def topic_frequency_over_time(self, freq: str = "W") -> list[dict]:
        if "topic_label" not in self.df.columns:
            return []
        grouped = self.df.groupby([pd.Grouper(key="timestamp", freq=freq), "topic_label"]).size().reset_index(name="count")
        result = []
        for _, row in grouped.iterrows():
            result.append({
                "period": row["timestamp"].isoformat(),
                "topic": row["topic_label"],
                "count": int(row["count"]),
            })
        return result

    def detect_spikes(self, metric: str = "negative_ratio", threshold_std: float = 2.0) -> list[dict]:
        daily = pd.DataFrame(self.sentiment_over_time("D"))
        if daily.empty or metric not in daily.columns:
            return []
        mean = daily[metric].mean()
        std = daily[metric].std()
        if std == 0:
            return []
        daily["z_score"] = (daily[metric] - mean) / std
        spikes = daily[daily["z_score"] > threshold_std]
        return [
            {
                "date": row["period"],
                "value": round(float(row[metric]), 4),
                "z_score": round(float(row["z_score"]), 2),
                "severity": "high" if row["z_score"] > 3 else "medium",
                "total_mentions": int(row["total"]),
            }
            for _, row in spikes.iterrows()
        ]

    def detect_emerging_topics(self, lookback_days: int = 14) -> list[dict]:
        if "topic_label" not in self.df.columns:
            return []
        now = self.df["timestamp"].max()
        recent = self.df[self.df["timestamp"] >= now - timedelta(days=lookback_days)]
        older = self.df[self.df["timestamp"] < now - timedelta(days=lookback_days)]

        recent_counts = recent["topic_label"].value_counts(normalize=True)
        older_counts = older["topic_label"].value_counts(normalize=True)

        emerging = []
        for topic in recent_counts.index:
            if topic is None:
                continue
            recent_share = recent_counts.get(topic, 0)
            older_share = older_counts.get(topic, 0)
            if older_share > 0:
                growth = (recent_share - older_share) / older_share
            elif recent_share > 0:
                growth = float("inf")
            else:
                growth = 0
            if growth > 0.3:
                emerging.append({
                    "topic": topic,
                    "recent_share": round(float(recent_share), 4),
                    "previous_share": round(float(older_share), 4),
                    "growth_rate": round(float(growth), 4) if growth != float("inf") else 999.0,
                    "recent_count": int(recent[recent["topic_label"] == topic].shape[0]),
                })
        return sorted(emerging, key=lambda x: x["growth_rate"], reverse=True)

    def detect_sentiment_shifts(self, window_days: int = 7) -> list[dict]:
        daily = pd.DataFrame(self.sentiment_over_time("D"))
        if daily.empty or len(daily) < window_days * 2:
            return []
        daily["rolling_neg"] = daily["negative_ratio"].rolling(window=window_days).mean()
        daily["rolling_pos"] = daily["positive_ratio"].rolling(window=window_days).mean()
        daily["neg_shift"] = daily["rolling_neg"].diff(window_days)
        daily["pos_shift"] = daily["rolling_pos"].diff(window_days)

        shifts = []
        for _, row in daily.dropna().iterrows():
            if abs(row["neg_shift"]) > 0.15 or abs(row["pos_shift"]) > 0.15:
                direction = "worsening" if row["neg_shift"] > 0 else "improving"
                shifts.append({
                    "date": row["period"],
                    "direction": direction,
                    "negative_change": round(float(row["neg_shift"]), 4),
                    "positive_change": round(float(row["pos_shift"]), 4),
                })
        return shifts

    def generate_alerts(self) -> list[dict]:
        alerts = []
        spikes = self.detect_spikes()
        for spike in spikes:
            alerts.append({
                "type": "negative_spike",
                "severity": spike["severity"],
                "message": f"Negative sentiment spike detected on {spike['date']} (z-score: {spike['z_score']})",
                "data": spike,
            })
        shifts = self.detect_sentiment_shifts()
        for shift in shifts:
            if shift["direction"] == "worsening":
                alerts.append({
                    "type": "sentiment_shift",
                    "severity": "medium",
                    "message": f"Sentiment worsening trend detected around {shift['date']}",
                    "data": shift,
                })
        emerging = self.detect_emerging_topics()
        for topic in emerging[:5]:
            alerts.append({
                "type": "emerging_topic",
                "severity": "info",
                "message": f"Emerging topic detected: '{topic['topic']}' (growth: {topic['growth_rate']:.0%})",
                "data": topic,
            })
        return alerts

    def get_full_trends(self) -> dict:
        return {
            "sentiment_daily": self.sentiment_over_time("D"),
            "sentiment_weekly": self.sentiment_over_time("W"),
            "topic_frequency": self.topic_frequency_over_time("W"),
            "spikes": self.detect_spikes(),
            "emerging_topics": self.detect_emerging_topics(),
            "sentiment_shifts": self.detect_sentiment_shifts(),
            "alerts": self.generate_alerts(),
        }
