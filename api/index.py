"""
CineScope semantic recommender — Vercel Python serverless function.

Serves the same contract the Render FastAPI service exposed:

    POST /api/v1/recommend   -> { query, recommendations[], count }
    GET  /api/health         -> { status, model_loaded, count }

The engine is loaded lazily on the first request of a cold instance and reused
by every subsequent request that lands on the same instance.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, List, Optional

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Vercel imports this file as a top-level module, so api/ is not on sys.path.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from _engine import EngineNotReady, get_engine  # noqa: E402

MAX_TOP_K = 50


class RecommendationRequest(BaseModel):
    synopsis: str = Field(..., min_length=10, max_length=5000, description="Movie synopsis/overview")
    genre: Optional[str] = Field(None, description='Comma-separated genres, e.g. "Horror, Mystery"')
    year: Optional[int] = Field(None, ge=1888, le=2100, description="Release year")
    title: Optional[str] = Field(None, max_length=200, description="Movie title")
    top_k: int = Field(10, ge=1, le=MAX_TOP_K, description="How many similar movies to return")


class MovieRecommendation(BaseModel):
    movie_id: int
    similarity_score: float = Field(..., description="Cosine similarity, 0.0 to 1.0")
    title: Optional[str] = None
    overview: Optional[str] = None
    year: Optional[int] = None
    poster_path: Optional[str] = None
    genres_list: List[str] = Field(default_factory=list)


class RecommendationResponse(BaseModel):
    query: str
    recommendations: List[MovieRecommendation]
    count: int


router = APIRouter(tags=["recommendations"])


@router.post("/recommend", response_model=RecommendationResponse, summary="Get movie recommendations")
def recommend(request: RecommendationRequest) -> Any:
    try:
        engine = get_engine()
    except EngineNotReady as exc:
        raise HTTPException(status_code=503, detail=f"Recommendation engine unavailable: {exc}") from exc

    try:
        return engine.recommend(
            synopsis=request.synopsis,
            genre=request.genre,
            year=request.year,
            title=request.title,
            top_k=request.top_k,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


app = FastAPI(
    title="CineScope Semantic Recommender",
    description="Exact cosine retrieval over 62k TMDB movie embeddings (MiniLM ONNX + int8 index)",
    version="2.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Vercel forwards the original request path, so the routes are mounted where the
# browser actually calls them. /v1 is kept as an alias for existing clients.
app.include_router(router, prefix="/api/v1")
app.include_router(router, prefix="/v1")


def _health() -> dict[str, Any]:
    try:
        engine = get_engine()
    except EngineNotReady as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "status": "healthy",
        "model_loaded": engine.is_loaded,
        "count": engine.count,
        "dim": engine.manifest.get("dim"),
    }


app.add_api_route("/api/health", _health, methods=["GET"], tags=["system"])
app.add_api_route("/health", _health, methods=["GET"], tags=["system"])
