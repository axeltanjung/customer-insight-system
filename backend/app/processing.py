from __future__ import annotations

import logging
import re
import unicodedata

import emoji
import pandas as pd
from langdetect import detect, LangDetectException

logger = logging.getLogger(__name__)

URL_PATTERN = re.compile(r"https?://\S+|www\.\S+")
MENTION_PATTERN = re.compile(r"@\w+")
HASHTAG_PATTERN = re.compile(r"#(\w+)")
HTML_PATTERN = re.compile(r"<[^>]+>")
WHITESPACE_PATTERN = re.compile(r"\s+")
REDDIT_PATTERNS = re.compile(r"(\[deleted\]|\[removed\]|/u/\w+|/r/\w+)")


def clean_text(text: str) -> str:
    if not isinstance(text, str) or not text.strip():
        return ""
    text = HTML_PATTERN.sub("", text)
    text = URL_PATTERN.sub("", text)
    text = REDDIT_PATTERNS.sub("", text)
    text = MENTION_PATTERN.sub("", text)
    text = HASHTAG_PATTERN.sub(r"\1", text)
    text = emoji.demojize(text, delimiters=(" ", " "))
    text = unicodedata.normalize("NFKD", text)
    text = WHITESPACE_PATTERN.sub(" ", text).strip()
    return text


def detect_language(text: str) -> str:
    try:
        return detect(text) if len(text) > 20 else "en"
    except LangDetectException:
        return "unknown"


def process_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    logger.info(f"Processing {len(df)} records")
    df = df.copy()
    df["text"] = df["text"].fillna("")
    df["clean_text"] = df["text"].apply(clean_text)
    df = df[df["clean_text"].str.len() > 10].reset_index(drop=True)
    df["language"] = df["clean_text"].apply(detect_language)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
    df["date"] = df["timestamp"].dt.date
    df["week"] = df["timestamp"].dt.isocalendar().week.astype(int)
    df["month"] = df["timestamp"].dt.to_period("M").astype(str)
    df["text_length"] = df["clean_text"].str.len()
    df["word_count"] = df["clean_text"].str.split().str.len()
    logger.info(f"Processed down to {len(df)} records ({len(df[df['language'] == 'en'])} English)")
    return df
