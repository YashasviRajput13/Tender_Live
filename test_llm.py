import os
from backend.services.ai_gemini import ask_llm

if __name__ == "__main__":
    try:
        response = ask_llm("What is the capital of France?", json_mode=False)
        print("LLM Response:", response)
    except Exception as e:
        print("Error:", e)
