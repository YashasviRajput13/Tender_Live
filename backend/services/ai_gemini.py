import logging

try:
    from google import genai
except ImportError:
    genai = None  # Gemini not installed; will be unavailable
from openai import OpenAI
from config import settings


logger = logging.getLogger(__name__)

# Initialize Gemini
if settings.GEMINI_API_KEY and genai:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        logger.info("Gemini API configured successfully.")
    except Exception as e:
        logger.error(f"Failed to configure Gemini API: {str(e)}")
else:
    logger.warning(
        "Gemini is unavailable: either GEMINI_API_KEY not set or google-generativeai not installed."
    )

# Initialize OpenAI if key is present
openai_client = None
if settings.OPENAI_API_KEY:
    try:
        openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        logger.info("OpenAI API client initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {str(e)}")

# Initialize Groq client if Groq API key is present
groq_client = None
if settings.GROQ_API_KEY:
    try:
        groq_client = OpenAI(
            api_key=settings.GROQ_API_KEY, base_url=settings.GROQ_BASE_URL
        )
        logger.info("Groq API client initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {str(e)}")


def query_gemini(prompt: str, json_mode: bool = False, temperature: float = 0.2) -> str:
    """
    Run a zero-shot prompt directly against Gemini 1.5 Flash.
    """
    if not settings.GEMINI_API_KEY or not genai:
        raise ValueError(
            "Gemini is not configured: missing GEMINI_API_KEY or google-generativeai package."
        )

    model = genai.GenerativeModel("gemini-2.0-flash")

    generation_config = {"temperature": temperature}
    if json_mode:
        generation_config["response_mime_type"] = "application/json"

    response = model.generate_content(prompt, generation_config=generation_config)
    return response.text.strip()


def query_openai(prompt: str, json_mode: bool = False, temperature: float = 0.2) -> str:
    """
    Run prompt against OpenAI GPT-4o-mini or Groq model as fallback.
    """
    if not (openai_client or groq_client):
        raise ValueError("No LLM client is configured in the environment.")

    response_format = {"type": "json_object"} if json_mode else None

    # Choose model based on which client is active
    if groq_client:
        model_name = settings.GROQ_MODEL
    else:
        model_name = "gpt-4o-mini"

    client = groq_client if groq_client else openai_client
    response = client.chat.completions.create(
        model=model_name,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        response_format=response_format,
    )
    return response.choices[0].message.content.strip()


def ask_llm(prompt: str, json_mode: bool = False, temperature: float = 0.2) -> str:
    """
    Primary LLM executor that defaults to Gemini and falls back to OpenAI if Gemini fails.
    """
    # 1. Try Gemini
    if settings.GEMINI_API_KEY:
        try:
            logger.info("Directing request to Gemini API...")
            return query_gemini(prompt, json_mode, temperature)
        except Exception as e:
            logger.error(f"Gemini query failed: {str(e)}. Attempting Groq fallback...")

    # 2. Try Groq fallback
    if settings.GROQ_API_KEY and groq_client:
        try:
            logger.info("Directing request to Groq API (fallback)...")
            return query_openai(prompt, json_mode, temperature)
        except Exception as e:
            logger.error(f"Groq fallback query also failed: {str(e)}")

    # 3. Try OpenAI fallback (if still configured)
    if settings.OPENAI_API_KEY and openai_client:
        try:
            logger.info("Directing request to OpenAI API (fallback)...")
            return query_openai(prompt, json_mode, temperature)
        except Exception as e:
            logger.error(f"OpenAI fallback query also failed: {str(e)}")

    # 4. All options exhausted
    raise ValueError(
        "No active AI keys configured. Please add GROQ_API_KEY or other LLM keys to your env settings."
    )
