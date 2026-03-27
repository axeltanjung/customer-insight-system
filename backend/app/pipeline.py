from __future__ import annotations

import json
import logging
from typing import Optional

import pandas as pd

from app.config import ALERTS_PATH, PROCESSED_DATA_PATH, TOPICS_PATH, TRENDS_PATH
from app.ingestion import RedditCollector
from app.ner import NERExtractor
from app.processing import process_dataframe
from app.sentiment import SentimentEngine
from app.topics import TopicModeler
from app.trends import TrendAnalyzer

logger = logging.getLogger(__name__)


class InsightPipeline:
    def __init__(self, use_transformer: bool = True):
        self.collector = RedditCollector()
        self.sentiment_engine = SentimentEngine(use_transformer=use_transformer)
        self.topic_modeler = TopicModeler()
        self.ner_extractor = NERExtractor()
        self.df: Optional[pd.DataFrame] = None
        self.trends: Optional[dict] = None
        self.topics_summary: Optional[list[dict]] = None
        self.entity_summary: Optional[dict] = None
        self.alerts: Optional[list[dict]] = None

    def run(self, limit: int = 5000) -> dict:
        logger.info("=== Starting Insight Pipeline ===")

        logger.info("Step 1: Data ingestion")
        raw_df = self.collector.collect(limit=limit)

        logger.info("Step 2: Data processing")
        processed_df = process_dataframe(raw_df)

        logger.info("Step 3: Sentiment analysis")
        self.df = self.sentiment_engine.analyze_dataframe(processed_df)

        logger.info("Step 4: Topic modeling")
        self.df = self.topic_modeler.apply_to_dataframe(self.df)
        self.topics_summary = self.topic_modeler.get_topics_summary()

        logger.info("Step 5: NER extraction")
        self.entity_summary = self.ner_extractor.get_entity_summary(self.df["clean_text"].tolist())

        logger.info("Step 6: Trend analysis")
        analyzer = TrendAnalyzer(self.df)
        self.trends = analyzer.get_full_trends()
        self.alerts = analyzer.generate_alerts()

        self._save_artifacts()
        logger.info("=== Pipeline complete ===")

        return {
            "total_records": len(self.df),
            "sentiment_distribution": self.df["sentiment_label"].value_counts().to_dict(),
            "num_topics": len([t for t in self.topics_summary if t["topic_id"] != -1]),
            "num_alerts": len(self.alerts),
            "num_entity_types": len(self.entity_summary),
        }

    def _save_artifacts(self):
        if self.df is not None:
            self.df.to_parquet(PROCESSED_DATA_PATH, index=False)
        if self.topics_summary is not None:
            with open(TOPICS_PATH, "w") as f:
                json.dump(self.topics_summary, f, default=str)
        if self.trends is not None:
            with open(TRENDS_PATH, "w") as f:
                json.dump(self.trends, f, default=str)
        if self.alerts is not None:
            with open(ALERTS_PATH, "w") as f:
                json.dump(self.alerts, f, default=str)

    def load_artifacts(self) -> bool:
        try:
            self.df = pd.read_parquet(PROCESSED_DATA_PATH)
            with open(TOPICS_PATH) as f:
                self.topics_summary = json.load(f)
            with open(TRENDS_PATH) as f:
                self.trends = json.load(f)
            with open(ALERTS_PATH) as f:
                self.alerts = json.load(f)
            logger.info("Loaded existing artifacts")
            return True
        except FileNotFoundError:
            logger.info("No existing artifacts found")
            return False

    def get_kpis(self) -> dict:
        if self.df is None:
            return {}
        total = len(self.df)
        sentiments = self.df["sentiment_label"].value_counts()
        return {
            "total_mentions": total,
            "positive_pct": round(sentiments.get("positive", 0) / total * 100, 1),
            "negative_pct": round(sentiments.get("negative", 0) / total * 100, 1),
            "neutral_pct": round(sentiments.get("neutral", 0) / total * 100, 1),
            "avg_score": round(float(self.df["score"].mean()), 1),
            "avg_engagement": round(float(self.df["num_comments"].mean()), 1),
            "top_subreddit": self.df["subreddit"].mode().iloc[0] if "subreddit" in self.df else "N/A",
            "date_range": {
                "start": str(self.df["timestamp"].min()),
                "end": str(self.df["timestamp"].max()),
            },
        }

    def search(self, query: str, sentiment: Optional[str] = None, topic: Optional[str] = None, limit: int = 50) -> list[dict]:
        if self.df is None:
            return []
        mask = self.df["clean_text"].str.contains(query, case=False, na=False)
        if sentiment:
            mask &= self.df["sentiment_label"] == sentiment
        if topic:
            mask &= self.df["topic_label"].str.contains(topic, case=False, na=False)
        results = self.df[mask].head(limit)
        return results[["id", "clean_text", "sentiment_label", "sentiment_score", "topic_label", "timestamp", "score", "subreddit"]].to_dict(orient="records")
