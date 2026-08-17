import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8009))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting FastAPI Platform on http://{host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
