from __future__ import annotations

import logging
from typing import Optional

import spacy
from spacy.language import Language

from app.config import SPACY_MODEL

logger = logging.getLogger(__name__)


class NERExtractor:
    def __init__(self):
        self.nlp: Optional[Language] = None
        try:
            self.nlp = spacy.load(SPACY_MODEL)
            logger.info(f"Loaded spaCy model: {SPACY_MODEL}")
        except OSError:
            logger.warning(f"spaCy model {SPACY_MODEL} not found. Run: python -m spacy download {SPACY_MODEL}")

    def extract(self, text: str) -> list[dict]:
        if self.nlp is None:
            return []
        doc = self.nlp(text[:5000])
        entities = []
        seen = set()
        for ent in doc.ents:
            key = (ent.text.lower(), ent.label_)
            if key not in seen:
                seen.add(key)
                entities.append({
                    "text": ent.text,
                    "label": ent.label_,
                    "start": ent.start_char,
                    "end": ent.end_char,
                })
        return entities

    def extract_batch(self, texts: list[str]) -> list[list[dict]]:
        if self.nlp is None:
            return [[] for _ in texts]
        results = []
        for doc in self.nlp.pipe(texts, batch_size=50):
            entities = []
            seen = set()
            for ent in doc.ents:
                key = (ent.text.lower(), ent.label_)
                if key not in seen:
                    seen.add(key)
                    entities.append({"text": ent.text, "label": ent.label_})
            results.append(entities)
        return results

    def get_entity_summary(self, texts: list[str]) -> dict:
        all_entities = self.extract_batch(texts)
        entity_counts: dict[str, dict[str, int]] = {}
        for entities in all_entities:
            for ent in entities:
                label = ent["label"]
                text = ent["text"]
                if label not in entity_counts:
                    entity_counts[label] = {}
                entity_counts[label][text] = entity_counts[label].get(text, 0) + 1
        summary = {}
        for label, counts in entity_counts.items():
            sorted_entities = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:20]
            summary[label] = [{"entity": e, "count": c} for e, c in sorted_entities]
        return summary
