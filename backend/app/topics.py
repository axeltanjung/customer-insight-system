from __future__ import annotations

import logging
from typing import Optional

import numpy as np
import pandas as pd
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer

from app.config import EMBEDDING_MODEL_NAME

logger = logging.getLogger(__name__)


class TopicModeler:
    def __init__(self):
        self.model: Optional[BERTopic] = None
        self.embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        self.topic_info: Optional[pd.DataFrame] = None
        self.topic_labels: dict[int, str] = {}

    def fit(self, texts: list[str], min_topic_size: int = 30) -> tuple[list[int], np.ndarray]:
        logger.info(f"Fitting BERTopic on {len(texts)} documents")
        vectorizer = CountVectorizer(stop_words="english", min_df=5, max_df=0.95, ngram_range=(1, 2))
        self.model = BERTopic(
            embedding_model=self.embedding_model,
            vectorizer_model=vectorizer,
            min_topic_size=min_topic_size,
            nr_topics="auto",
            verbose=True,
            calculate_probabilities=True,
        )
        topics, probs = self.model.fit_transform(texts)
        self.topic_info = self.model.get_topic_info()
        self._generate_labels()
        logger.info(f"Found {len(self.topic_info) - 1} topics (excluding outlier topic)")
        return topics, probs

    def _generate_labels(self):
        if self.model is None:
            return
        self.topic_labels = {}
        for topic_id in self.model.get_topics():
            if topic_id == -1:
                self.topic_labels[-1] = "Miscellaneous / Unclassified"
                continue
            words = self.model.get_topic(topic_id)
            top_words = [w for w, _ in words[:5]]
            primary = top_words[0].replace("_", " ").title()
            secondary = ", ".join(top_words[1:3])
            self.topic_labels[topic_id] = f"{primary} ({secondary})"

    def get_topics_summary(self) -> list[dict]:
        if self.model is None:
            return []
        summaries = []
        for _, row in self.topic_info.iterrows():
            topic_id = row["Topic"]
            words = self.model.get_topic(topic_id)
            summaries.append({
                "topic_id": int(topic_id),
                "label": self.topic_labels.get(topic_id, f"Topic {topic_id}"),
                "count": int(row["Count"]),
                "keywords": [{"word": w, "weight": round(float(s), 4)} for w, s in words[:10]],
                "representative_docs": self._get_representative_docs(topic_id),
            })
        return sorted(summaries, key=lambda x: x["count"], reverse=True)

    def _get_representative_docs(self, topic_id: int, n: int = 3) -> list[str]:
        if self.model is None:
            return []
        try:
            docs = self.model.get_representative_docs(topic_id)
            return docs[:n] if docs else []
        except Exception:
            return []

    def transform(self, texts: list[str]) -> tuple[list[int], np.ndarray]:
        if self.model is None:
            raise RuntimeError("Model not fitted")
        return self.model.transform(texts)

    def predict_single(self, text: str) -> dict:
        if self.model is None:
            return {"topic_id": -1, "label": "Unknown", "confidence": 0.0}
        topics, probs = self.model.transform([text])
        topic_id = topics[0]
        prob = float(probs[0].max()) if hasattr(probs[0], "max") else float(probs[0])
        return {
            "topic_id": int(topic_id),
            "label": self.topic_labels.get(topic_id, f"Topic {topic_id}"),
            "confidence": round(prob, 4),
        }

    def apply_to_dataframe(self, df: pd.DataFrame, text_col: str = "clean_text") -> pd.DataFrame:
        df = df.copy()
        texts = df[text_col].tolist()
        topics, probs = self.fit(texts)
        df["topic_id"] = topics
        df["topic_label"] = df["topic_id"].map(self.topic_labels)
        df["topic_confidence"] = [float(p.max()) if hasattr(p, "max") else float(p) for p in probs]
        return df
