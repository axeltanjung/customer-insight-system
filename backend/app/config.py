import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT", "customer-insight-bot/1.0")
REDDIT_SUBREDDITS = os.getenv("REDDIT_SUBREDDITS", "technology,programming").split(",")
DATA_COLLECT_LIMIT = int(os.getenv("DATA_COLLECT_LIMIT", "5000"))

ALERT_NEGATIVE_THRESHOLD = float(os.getenv("ALERT_NEGATIVE_THRESHOLD", "0.4"))
ALERT_EMAIL = os.getenv("ALERT_EMAIL", "admin@example.com")

SENTIMENT_MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
SPACY_MODEL = "en_core_web_sm"

RAW_DATA_PATH = DATA_DIR / "raw_data.parquet"
PROCESSED_DATA_PATH = DATA_DIR / "processed_data.parquet"
TOPICS_PATH = DATA_DIR / "topics.json"
TRENDS_PATH = DATA_DIR / "trends.json"
ALERTS_PATH = DATA_DIR / "alerts.json"
