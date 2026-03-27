from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
import praw
from praw.exceptions import PRAWException

from app.config import (
    DATA_COLLECT_LIMIT,
    RAW_DATA_PATH,
    REDDIT_CLIENT_ID,
    REDDIT_CLIENT_SECRET,
    REDDIT_SUBREDDITS,
    REDDIT_USER_AGENT,
)

logger = logging.getLogger(__name__)


class RedditCollector:
    def __init__(self):
        self.reddit: Optional[praw.Reddit] = None
        if REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET:
            try:
                self.reddit = praw.Reddit(
                    client_id=REDDIT_CLIENT_ID,
                    client_secret=REDDIT_CLIENT_SECRET,
                    user_agent=REDDIT_USER_AGENT,
                )
                logger.info("Reddit API client initialized")
            except Exception as e:
                logger.warning(f"Failed to init Reddit client: {e}")

    def collect(self, limit: int = DATA_COLLECT_LIMIT) -> pd.DataFrame:
        if self.reddit is None:
            logger.info("No Reddit credentials — using synthetic data")
            return generate_synthetic_data(limit)
        try:
            return self._collect_from_reddit(limit)
        except PRAWException as e:
            logger.warning(f"Reddit API error: {e} — falling back to synthetic")
            return generate_synthetic_data(limit)

    def _collect_from_reddit(self, limit: int) -> pd.DataFrame:
        records = []
        per_sub = max(limit // len(REDDIT_SUBREDDITS), 100)
        for sub_name in REDDIT_SUBREDDITS:
            subreddit = self.reddit.subreddit(sub_name)
            for submission in subreddit.hot(limit=per_sub // 3):
                records.append(self._submission_to_record(submission, sub_name))
                submission.comments.replace_more(limit=0)
                for comment in submission.comments.list()[:5]:
                    records.append(self._comment_to_record(comment, sub_name, submission.title))
            for submission in subreddit.new(limit=per_sub // 3):
                records.append(self._submission_to_record(submission, sub_name))
            for submission in subreddit.top(time_filter="month", limit=per_sub // 3):
                records.append(self._submission_to_record(submission, sub_name))
            if len(records) >= limit:
                break
        df = pd.DataFrame(records[:limit])
        df.to_parquet(RAW_DATA_PATH, index=False)
        logger.info(f"Collected {len(df)} records from Reddit")
        return df

    @staticmethod
    def _submission_to_record(submission, subreddit: str) -> dict:
        return {
            "id": submission.id,
            "text": f"{submission.title} {submission.selftext}".strip(),
            "timestamp": datetime.utcfromtimestamp(submission.created_utc).isoformat(),
            "source": "reddit",
            "subreddit": subreddit,
            "score": submission.score,
            "num_comments": submission.num_comments,
            "content_type": "submission",
        }

    @staticmethod
    def _comment_to_record(comment, subreddit: str, parent_title: str) -> dict:
        return {
            "id": comment.id,
            "text": comment.body,
            "timestamp": datetime.utcfromtimestamp(comment.created_utc).isoformat(),
            "source": "reddit",
            "subreddit": subreddit,
            "score": comment.score,
            "num_comments": 0,
            "content_type": "comment",
        }


SYNTHETIC_TEMPLATES = {
    "positive": [
        "Absolutely love the new {product} update! The {feature} feature is incredible and saves me so much time.",
        "Just switched to {product} and I'm blown away by {feature}. Best decision I made this year!",
        "The customer support at {product} is outstanding. They resolved my issue with {feature} in minutes.",
        "{product}'s {feature} integration works flawlessly. Highly recommend to anyone looking for a solution.",
        "Finally a {product} that gets {feature} right. The UX is smooth and intuitive.",
        "Been using {product} for 6 months now. The {feature} keeps getting better with every update.",
        "The {feature} in {product} is a game-changer for our team's productivity. ROI is amazing.",
        "Impressed by how {product} handles {feature}. Way better than competitors.",
        "Our whole team migrated to {product} for the {feature}. Zero regrets.",
        "{product} just released {feature} and it's exactly what we needed. Great job!",
    ],
    "negative": [
        "Terrible experience with {product}. The {feature} keeps crashing every time I try to use it.",
        "{product}'s {feature} is completely broken after the last update. Very disappointed.",
        "Can't believe {product} charges so much for {feature} that barely works. Looking for alternatives.",
        "The {feature} in {product} has been down for 3 days now. No communication from their team.",
        "Wasted 2 hours trying to get {feature} working in {product}. Their docs are useless.",
        "Just lost all my data because {product}'s {feature} failed during sync. Absolutely unacceptable.",
        "{product} promised {feature} would be ready by Q1. It's Q3 and still nothing. Losing trust.",
        "Switched away from {product} today. The {feature} was the last straw.",
        "Security vulnerability in {product}'s {feature}? This is concerning for enterprise users.",
        "Performance of {feature} in {product} has degraded significantly. Time to look elsewhere.",
    ],
    "neutral": [
        "Has anyone tried the {feature} in {product}? Looking for honest reviews before committing.",
        "{product} released an update for {feature}. Not sure what changed exactly.",
        "Comparing {product} vs alternatives for {feature}. Any recommendations?",
        "The {feature} in {product} works as expected. Nothing special but gets the job done.",
        "Setting up {product}'s {feature} for the first time. The documentation could be better.",
        "Interesting approach by {product} for {feature}. Let's see how it evolves.",
        "Anyone know if {product} supports {feature} for enterprise accounts?",
        "Migrating from legacy system to {product}. The {feature} seems comparable.",
        "{product} announced pricing changes for {feature}. Need to evaluate impact.",
        "Workshop on {product}'s {feature} next week. Who's attending?",
    ],
}

PRODUCTS = [
    "CloudSync", "DataFlow Pro", "AnalyticsPlatform", "StreamLine", "InsightHub",
    "MetricsPro", "AutoScale", "DevOps360", "SecureVault", "APIGateway",
    "SmartDash", "PipelineIO", "ModelServe", "QueryEngine", "DataLake Pro",
]

FEATURES = [
    "real-time analytics", "data pipeline", "API integration", "dashboard",
    "machine learning", "authentication", "monitoring", "deployment",
    "reporting", "collaboration", "automation", "search", "backup",
    "notification system", "user management", "billing", "performance tuning",
]

SUBREDDITS = ["technology", "programming", "artificial", "machinelearning", "datascience"]


def generate_synthetic_data(n: int = 5000) -> pd.DataFrame:
    random.seed(42)
    records = []
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=90)

    sentiment_weights = [0.40, 0.35, 0.25]
    sentiments = ["positive", "negative", "neutral"]

    for i in range(n):
        sentiment = random.choices(sentiments, weights=sentiment_weights, k=1)[0]
        template = random.choice(SYNTHETIC_TEMPLATES[sentiment])
        product = random.choice(PRODUCTS)
        feature = random.choice(FEATURES)
        text = template.format(product=product, feature=feature)

        days_offset = random.uniform(0, (end_date - start_date).days)
        timestamp = start_date + timedelta(days=days_offset)

        if random.random() < 0.15:
            spike_day = random.choice([7, 14, 30, 45, 60])
            spike_date = end_date - timedelta(days=spike_day)
            timestamp = spike_date + timedelta(hours=random.uniform(-12, 12))
            if random.random() < 0.7:
                sentiment = "negative"
                template = random.choice(SYNTHETIC_TEMPLATES["negative"])
                text = template.format(product=product, feature=feature)

        score = random.randint(-5, 500) if sentiment == "positive" else random.randint(-20, 100)
        records.append({
            "id": f"syn_{i:06d}",
            "text": text,
            "timestamp": timestamp.isoformat(),
            "source": "synthetic",
            "subreddit": random.choice(SUBREDDITS),
            "score": score,
            "num_comments": random.randint(0, 200),
            "content_type": random.choice(["submission", "comment"]),
        })

    df = pd.DataFrame(records)
    df.to_parquet(RAW_DATA_PATH, index=False)
    logger.info(f"Generated {len(df)} synthetic records")
    return df
