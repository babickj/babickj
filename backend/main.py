"""FastAPI application entry point."""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.agents import router as agents_router
from api.chat import router as chat_router
from api.settings import router as settings_router

app = FastAPI(
    title="EdgeRunner AI Agent Creator API",
    version="1.0.0",
    description="Backend for the EdgeRunner AI Agent Creator",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "app://.", "file://"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents_router)
app.include_router(chat_router)
app.include_router(settings_router)


@app.get("/")
def root():
    return {"status": "EdgeRunner API running", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8765,
        reload=False,
        log_level="info",
    )
