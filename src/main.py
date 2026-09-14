import os
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel


# ============================================================
# STRUCTURED OUTPUT SCHEMA
# ============================================================

class EmailResponse(BaseModel):
    subject: str
    body: str


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    print("Error: GROQ_API_KEY is not configured in the .env file.")
    exit()


# ============================================================
# GROQ CLIENT
# ============================================================

client = OpenAI(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1"
)


# ============================================================
# COLLECT USER INFORMATION
# ============================================================

print("\n========== AI EMAIL COPILOT ==========\n")

purpose = input(
    "What type of email do you want to write?\n> "
)

recipient = input(
    "\nWho are you writing to?\n> "
)

context = input(
    "\nWhat is the context?\n> "
)

important_points = input(
    "\nWhat important points should be included?\n> "
)

tone = input(
    "\nWhat tone should the email have?\n> "
)

formality = input(
    "\nHow formal should the email be?\n> "
)

length = input(
    "\nHow long should the email be?\n> "
)

language = input(
    "\nWhat language should the email be in?\n> "
)


# ============================================================
# INPUT GUARDRAILS
# ============================================================

required_inputs = {
    "Purpose": purpose,
    "Recipient": recipient,
    "Context": context,
    "Important points": important_points,
    "Tone": tone,
    "Formality": formality,
    "Length": length,
    "Language": language
}


# ------------------------------------------------------------
# Check for empty inputs
# ------------------------------------------------------------

for field, value in required_inputs.items():

    if not value.strip():

        print(f"\nError: {field} cannot be empty.")
        exit()


# ------------------------------------------------------------
# Check maximum input length
# ------------------------------------------------------------

MAX_INPUT_LENGTH = 3000

for field, value in required_inputs.items():

    if len(value) > MAX_INPUT_LENGTH:

        print(f"\nError: {field} is too long.")
        print(
            f"Maximum allowed length is "
            f"{MAX_INPUT_LENGTH} characters."
        )

        exit()


# ============================================================
# BUILD PROMPT
# ============================================================

prompt = f"""
Write an email based on the following information.

Purpose:
{purpose}

Recipient:
{recipient}

Context:
{context}

Important points:
{important_points}

Tone:
{tone}

Formality:
{formality}

Length:
{length}

Language:
{language}
"""


# ============================================================
# GENERATE EMAIL
# ============================================================

print(
    "\n========== GENERATING EMAIL... ==========\n"
)

try:

    response = client.responses.parse(

        model="openai/gpt-oss-20b",

        instructions="""
You are an AI Email Copilot.

Your task is to write a complete email based on
the information provided by the user.

Follow the user's instructions carefully.

The email must:

- Clearly communicate the user's intended purpose.
- Address the specified recipient appropriately.
- Use the provided context.
- Include the user's important points.
- Follow the requested tone.
- Follow the requested level of formality.
- Follow the requested length.
- Follow the requested language.
- Be clear, professional, and well-structured.

IMPORTANT FACTUAL GROUNDING RULES:

- Do not invent facts or details.
- Do not add statistics.
- Do not add dates.
- Do not add names.
- Do not add events.
- Do not add experiences.
- Do not add policies.
- Do not add reasons.
- Do not add claims that the user did not provide.
- Do not assume information that was not provided.
- If information is missing, write the email without
  inventing information.
- You may improve grammar, wording, and sentence structure.
- You may make the email sound natural and professional.
- However, preserve the original meaning of the user's information.

OUTPUT REQUIREMENTS:

- Provide a subject line.
- Provide the complete email body.
- Do not provide explanations.
- Do not provide analysis.
- Do not provide commentary outside the email.
""",

        input=prompt,

        text_format=EmailResponse
    )


# ============================================================
# API ERROR HANDLING
# ============================================================

except Exception as e:

    print("\nError: Failed to generate the email.")
    print("Details:", e)

    exit()


# ============================================================
# GET STRUCTURED RESPONSE
# ============================================================

email = response.output_parsed


# ============================================================
# OUTPUT VALIDATION
# ============================================================

if email is None:

    print(
        "\nError: AI did not return a valid email."
    )

    exit()


# ------------------------------------------------------------
# Validate subject
# ------------------------------------------------------------

if not email.subject.strip():

    print(
        "\nError: Generated email has no subject."
    )

    exit()


# ------------------------------------------------------------
# Validate body
# ------------------------------------------------------------

if not email.body.strip():

    print(
        "\nError: Generated email has no body."
    )

    exit()


# ------------------------------------------------------------
# Output length guardrails
# ------------------------------------------------------------

MAX_SUBJECT_LENGTH = 150
MAX_BODY_LENGTH = 5000


if len(email.subject) > MAX_SUBJECT_LENGTH:

    print(
        "\nError: Generated subject is too long."
    )

    exit()


if len(email.body) > MAX_BODY_LENGTH:

    print(
        "\nError: Generated email body is too long."
    )

    exit()


# ============================================================
# DISPLAY FINAL EMAIL
# ============================================================

print("\n========================================")
print("          GENERATED EMAIL")
print("========================================")

print("\nSubject:")
print(email.subject)

print("\nEmail Body:")
print(email.body)

print("\n========================================")