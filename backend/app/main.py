from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.pipeline import InsightPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

pipeline: Optional[InsightPipeline] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipeline
    pipeline = InsightPipeline(use_transformer=True)
    if not pipeline.load_artifacts():
        logger.info("No cached data found. Run POST /pipeline/run to start analysis.")
    yield


app = FastAPI(
    title="Customer Insight & Trend Intelligence API",
    description="NLP-powered API for extracting actionable insights from user-generated text data",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    text: str


class AnalyzeResponse(BaseModel):
    sentiment: dict
    topic: dict
    entities: list[dict]


class PipelineRunResponse(BaseModel):
    status: str
    summary: dict


@app.get("/health")
async def health():
    return {"status": "ok", "pipeline_loaded": pipeline is not None and pipeline.df is not None}


@app.post("/pipeline/run", response_model=PipelineRunResponse)
async def run_pipeline(limit: int = Query(5000, ge=100, le=50000)):
    if pipeline is None:
        raise HTTPException(500, "Pipeline not initialized")
    try:
        summary = pipeline.run(limit=limit)
        return {"status": "complete", "summary": summary}
    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        raise HTTPException(500, f"Pipeline failed: {str(e)}")


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_text(request: AnalyzeRequest):
    if pipeline is None:
        raise HTTPException(500, "Pipeline not initialized")
    sentiment = pipeline.sentiment_engine.analyze(request.text)
    topic = pipeline.topic_modeler.predict_single(request.text) if pipeline.topic_modeler.model else {"topic_id": -1, "label": "Unknown"}
    entities = pipeline.ner_extractor.extract(request.text)
    return {"sentiment": sentiment, "topic": topic, "entities": entities}


@app.get("/kpis")
async def get_kpis():
    if pipeline is None or pipeline.df is None:
        raise HTTPException(404, "No data loaded. Run the pipeline first.")
    return pipeline.get_kpis()


@app.get("/topics")
async def get_topics():
    if pipeline is None or pipeline.topics_summary is None:
        raise HTTPException(404, "No topics available. Run the pipeline first.")
    return {"topics": pipeline.topics_summary, "total_topics": len([t for t in pipeline.topics_summary if t["topic_id"] != -1])}


@app.get("/trends")
async def get_trends():
    if pipeline is None or pipeline.trends is None:
        raise HTTPException(404, "No trends available. Run the pipeline first.")
    return pipeline.trends


@app.get("/alerts")
async def get_alerts():
    if pipeline is None or pipeline.alerts is None:
        raise HTTPException(404, "No alerts available. Run the pipeline first.")
    return {"alerts": pipeline.alerts, "total": len(pipeline.alerts)}


@app.get("/search")
async def search(
    q: str = Query(..., min_length=1),
    sentiment: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
):
    if pipeline is None or pipeline.df is None:
        raise HTTPException(404, "No data loaded. Run the pipeline first.")
    results = pipeline.search(q, sentiment=sentiment, topic=topic, limit=limit)
    return {"query": q, "results": results, "count": len(results)}


@app.get("/entities")
async def get_entities():
    if pipeline is None or pipeline.entity_summary is None:
        raise HTTPException(404, "No entity data available. Run the pipeline first.")
    return pipeline.entity_summary


@app.get("/data/sample")
async def get_data_sample(limit: int = Query(100, ge=1, le=1000)):
    if pipeline is None or pipeline.df is None:
        raise HTTPException(404, "No data loaded.")
    sample = pipeline.df.head(limit)
    cols = ["id", "clean_text", "sentiment_label", "sentiment_score", "topic_label", "timestamp", "score", "subreddit"]
    available = [c for c in cols if c in sample.columns]
    return {"data": sample[available].to_dict(orient="records"), "total_records": len(pipeline.df)}
