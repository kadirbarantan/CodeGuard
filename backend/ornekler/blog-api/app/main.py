"""blog-api uygulaması."""
from fastapi import FastAPI

from .posts import router as posts_router

app = FastAPI(title="blog-api")
app.include_router(posts_router)
