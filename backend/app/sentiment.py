from __future__ import annotations

import logging
from typing import Optional

import numpy as np
import pandas as pd
from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from app.config import SENTIMENT_MODEL_NAME

logger = logging.getLogger(__name__)


class VaderSentimentAnalyzer:
    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()

    def analyze(self, text: str) -> dict:
        scores = self.analyzer.polarity_scores(text)
        compound = scores["compound"]
        if compound >= 0.05:
            label = "positive"
        elif compound <= -0.05:
            label = "negative"
        else:
            label = "neutral"
        return {"label": label, "score": abs(compound), "compound": compound, "method": "vader"}

    def analyze_batch(self, texts: list[str]) -> list[dict]:
        return [self.analyze(t) for t in texts]


class TransformerSentimentAnalyzer:
    def __init__(self, model_name: str = SENTIMENT_MODEL_NAME):
        self.model_name = model_name
        self._pipeline: Optional[pipeline] = None

    def _load(self):
        if self._pipeline is None:
            logger.info(f"Loading transformer model: {self.model_name}")
            self._pipeline = pipeline(
                "sentiment-analysis",
                model=self.model_name,
                tokenizer=self.model_name,
                max_length=512,
                truncation=True,
                top_k=None,
            )

    def analyze(self, text: str) -> dict:
        self._load()
        results = self._pipeline(text[:512])
        label_map = {"positive": "positive", "negative": "negative", "neutral": "neutral"}
        if isinstance(results[0], list):
            results = results[0]
        top = max(results, key=lambda x: x["score"])
        label = label_map.get(top["label"].lower(), top["label"].lower())
        return {"label": label, "score": top["score"], "all_scores": {r["label"]: r["score"] for r in results}, "method": "transformer"}

    def analyze_batch(self, texts: list[str], batch_size: int = 32) -> list[dict]:
        self._load()
        results = []
        label_map = {"positive": "positive", "negative": "negative", "neutral": "neutral"}
        for i in range(0, len(texts), batch_size):
            batch = [t[:512] for t in texts[i : i + batch_size]]
            batch_results = self._pipeline(batch)
            for res in batch_results:
                if isinstance(res, list):
                    scores = res
                else:
                    scores = [res]
                top = max(scores, key=lambda x: x["score"])
                label = label_map.get(top["label"].lower(), top["label"].lower())
                results.append({
                    "label": label,
                    "score": top["score"],
                    "all_scores": {r["label"]: r["score"] for r in scores},
                    "method": "transformer",
                })
        return results


class SentimentEngine:
    def __init__(self, use_transformer: bool = True):
        self.vader = VaderSentimentAnalyzer()
        self.transformer: Optional[TransformerSentimentAnalyzer] = None
        if use_transformer:
            try:
                self.transformer = TransformerSentimentAnalyzer()
            except Exception as e:
                logger.warning(f"Transformer init failed: {e}. Using VADER only.")

    def analyze(self, text: str) -> dict:
        vader_result = self.vader.analyze(text)
        if self.transformer:
            try:
                transformer_result = self.transformer.analyze(text)
                return {
                    "label": transformer_result["label"],
                    "score": transformer_result["score"],
                    "vader_label": vader_result["label"],
                    "vader_compound": vader_result["compound"],
                    "method": "ensemble",
                }
            except Exception:
                pass
        return vader_result

    def analyze_dataframe(self, df: pd.DataFrame, text_col: str = "clean_text") -> pd.DataFrame:
        df = df.copy()
        texts = df[text_col].tolist()

        vader_results = self.vader.analyze_batch(texts)
        df["vader_label"] = [r["label"] for r in vader_results]
        df["vader_score"] = [r["compound"] for r in vader_results]

        if self.transformer:
            try:
                transformer_results = self.transformer.analyze_batch(texts)
                df["sentiment_label"] = [r["label"] for r in transformer_results]
                df["sentiment_score"] = [r["score"] for r in transformer_results]
                df["sentiment_method"] = "transformer"
            except Exception as e:
                logger.warning(f"Transformer batch failed: {e}")
                df["sentiment_label"] = df["vader_label"]
                df["sentiment_score"] = df["vader_score"].abs()
                df["sentiment_method"] = "vader"
        else:
            df["sentiment_label"] = df["vader_label"]
            df["sentiment_score"] = df["vader_score"].abs()
            df["sentiment_method"] = "vader"

        logger.info(f"Sentiment analysis complete: {df['sentiment_label'].value_counts().to_dict()}")
        return df
