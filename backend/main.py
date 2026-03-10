from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ValidationError
from dotenv import load_dotenv
import httpx
import os
import json
import asyncio
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(
    title="CareerCopilot Pro API",
    description="Strategic AI Career Advisor - Ivy League Standard",
    version="0.4.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

MODELS = [
    "meta-llama/llama-3.2-3b-instruct:free",
    "qwen/qwen2.5-7b-instruct:free",
    "google/gemini-flash-1.5-exp:free"
]

http_client = httpx.AsyncClient(timeout=60.0)


#Request Models

class BaseCareerRequest(BaseModel):
    resume: str
    job_description: str
    tone: str = "Professional & High-Impact"

class JobAnalysisRequest(BaseModel):
    job_description: str

class MatchScoreRequest(BaseModel):
    resume: str
    job_description: str


#Response Models

class MatchScoreResult(BaseModel):
    match_score: int = Field(ge=0, le=100)
    matching_strengths: List[str]
    gaps: List[str]
    recommendations: List[str]


#Core LLM Logic

async def call_llm_strat(prompt: str, system_prompt: Optional[str] = None) -> str:
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="Missing API Configuration")

    system_content = system_prompt or (
        "You are a top-tier Career Strategy Consultant. "
        "Be precise, executive-level, and data-driven."
    )
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    for model in MODELS:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user",   "content": prompt}
            ],
            "temperature": 0.5
        }
        try:
            response = await http_client.post(OPENROUTER_URL, headers=headers, json=payload)
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"].strip()
        except Exception:
            continue

    raise HTTPException(status_code=503, detail="Intelligence providers unavailable.")


def clean_json_response(raw: str) -> dict:
    """Strip markdown fences and parse JSON."""
    try:
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0]
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0]
        return json.loads(raw.strip())
    except Exception:
        return {"error": "Parsing failed", "raw": raw}


#Endpoints

@app.get("/health")
def health():
    return {"status": "healthy", "version": "0.4.0"}


@app.get("/")
def root():
    return {"message": "CareerCopilot Pro API running"}


@app.post("/generate/job-analysis")
async def analyze_job(data: JobAnalysisRequest):
    """Analyze a job description — returns role summary, skills, culture fit, salary leverage."""
    prompt = f"""
Analyze this Job Description.
Return ONLY a JSON object with no extra text:
{{
    "role_summary": "1-sentence executive summary",
    "top_skills": ["List 5 skills"],
    "culture_fit": "Analysis of tone and culture",
    "salary_leverage_points": ["2 negotiation leverage points"]
}}
JD: {data.job_description}
"""
    raw = await call_llm_strat(prompt)
    return clean_json_response(raw)


@app.post("/generate/interview-prep")
async def interview_prep(data: BaseCareerRequest):
    """Generate 4 high-stakes interview Q&A pairs."""
    prompt = f"""
Based on the Resume and JD, generate 4 high-stakes interview questions.
Return ONLY a JSON array with no extra text:
[ {{"q": "The question", "a_strategy": "Strategic answer advice"}} ]
Resume: {data.resume}
JD: {data.job_description}
"""
    raw = await call_llm_strat(prompt)
    return {"questions": clean_json_response(raw)}


@app.post("/generate/match-score")
async def match_score(data: MatchScoreRequest):
    """Score resume-to-job fit and return structured strengths, gaps, and recommendations."""
    prompt = f"""
Compare the resume against the job description.
Return ONLY valid JSON with no extra text:
{{
    "match_score": <integer 0-100>,
    "matching_strengths": ["strength 1", "strength 2", ...],
    "gaps": ["gap 1", "gap 2", ...],
    "recommendations": ["action 1", "action 2", ...]
}}
Resume: {data.resume}
JD: {data.job_description}
"""
    raw = await call_llm_strat(prompt)
    parsed = clean_json_response(raw)

    if "error" in parsed:
        raise HTTPException(status_code=500, detail=f"Model returned invalid JSON: {parsed.get('raw', '')}")

    try:
        validated = MatchScoreResult(**parsed)
    except ValidationError as e:
        raise HTTPException(status_code=500, detail=f"Invalid match score structure: {e.errors()}")

    return {"result": validated.model_dump()}


@app.post("/generate/strategic-package")
async def get_full_analysis(data: BaseCareerRequest):
    """Generate cover letter + ATS insights in parallel."""
    analysis_prompt = f"""
Analyze alignment between the resume and job description.
Return ONLY a JSON object with no extra text:
{{
    "role_summary": "1-sentence summary",
    "required_skills": ["skill 1", "skill 2", "skill 3"],
    "gaps_found": ["gap 1", "gap 2"],
    "ats_compatibility_score": <integer 0-100>,
    "strategic_advice": "One high-level MBA-style tip"
}}
Resume: {data.resume}
JD: {data.job_description}
"""
    letter_prompt = f"""
Write a {data.tone} cover letter.
Focus on quantified achievements. No placeholders. No brackets.
Resume: {data.resume}
JD: {data.job_description}
"""

    raw_analysis, cover_letter = await asyncio.gather(
        call_llm_strat(analysis_prompt),
        call_llm_strat(letter_prompt)
    )

    return {
        "letter": cover_letter,
        "insights": clean_json_response(raw_analysis)
    }


@app.on_event("shutdown")
async def shutdown_event():
    await http_client.aclose()