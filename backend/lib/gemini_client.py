import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

gemini_api_key = os.environ.get("GEMINI_API_KEY")
gemini_client = genai.Client(api_key=gemini_api_key)
