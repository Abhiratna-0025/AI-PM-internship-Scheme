from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import build_agent


app = FastAPI(
    title="Crop Recommendation API",
    description="ML API for crop recommendation and WeatherGPT agent.",
    version="1.0.0",
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "welcome to weatherGPT"
    }


# ---------------------------------------------------------
# Weather Agent
# ---------------------------------------------------------

agent = build_agent(
    model_name="gemma4",
    base_url="http://localhost:11434",
)


class AgentRequest(BaseModel):
    prompt: str


class AgentResponse(BaseModel):
    message: str


@app.post("/agent", response_model=AgentResponse)
def weather_agent(request: AgentRequest):

    result = agent.invoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": request.prompt,
                }
            ]
        }
    )

    response = result["messages"][-1].content

    return {
        "message": response
    }