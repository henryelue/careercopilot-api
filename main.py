from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests

#API metadata
app = FastAPI(
    title = "CareerCopilot API",
    description = "AI assistant for resume and job application guidance",
    version= "0.1.0"
)

OLLAMA_URL ="http://localhost:11434/api/generate"
MODEL = "llama3.2:1b"


class Question(BaseModel):
    question: str

class JobDescription(BaseModel):
    question: str

#to monitor the system health
@app.get("/health")
def health():
    return{"status": "healthy"}

@app.get("/")
def root():
    return{"message": "CareerCopilot API running"}

@app.post("/chat")
def chat(data: Question):

    if not data.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty"
        )

    prompt = f"""
You are CareerCopilot, an AI assistant helping users improve resumes and job applications.

User Question:
{data.question}

Answer:
"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=60
        )

        response.raise_for_status()
        result = response.json()

        if "response" not in result:
            raise HTTPException(
                status_code=500,
                detail="Model returned unexpected format"
            )

        return {
            "status": "success",
            "model": MODEL,
            "answer": result["response"]
        }

    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=500,
            detail="Cannot connect to Ollama server"
        )

    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Model request timed out"
        )

    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

