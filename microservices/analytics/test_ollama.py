import requests
import os
from dotenv import load_dotenv

load_dotenv("../../.env")

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("MODEL_NAME", "llama3")

payload = {
    "model": MODEL_NAME,
    "prompt": "Dime una frase corta para probar la conexión con Ollama.",
    "stream": False  # <- desactiva el streaming
}

response = requests.post(f"{OLLAMA_URL}/api/generate", json=payload)

print("Status:", response.status_code)
print("Response:", response.json()["response"])
