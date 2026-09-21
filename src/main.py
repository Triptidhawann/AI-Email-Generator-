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
# INPUT COLLECTION + INPUT GUARDRAILS
# ============================================================

print("\n========== AI EMAIL COPILOT ==========\n")


def get_required_input(question):

    value = input(question)

    # Check empty input immediately
    if not value.strip():

        print("\nError: This field cannot be empty.")
        exit()

    # Check maximum input length
    if len(value) > 3000:

        print("\nError: Input is too long.")
        print("Maximum allowed length is 3000 characters.")
        exit()

    return value.strip()


purpose = get_required_input(
    "What type of email do you want to write?\n> "
)

recipient = get_required_input(
    "\nWho are you writing to?\n> "
)

context = get_required_input(
    "\nWhat is the context?\n> "
)

important_points = get_required_input(
    "\nWhat important points should be included?\n> "
)

tone = get_required_input(
    "\nWhat tone should the email have?\n> "
)

formality = get_required_input(
    "\nHow formal should the email be?\n> "
)

length = get_required_input(
    "\nHow long should the email be?\n> "
)

language = get_required_input(
    "\nWhat language should the email be in?\n> "
)


# ============================================================
# BUILD PROMPT
# ============================================================

prompt = f"""
Write an email based on the following user information.

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

print("\n========== GENERATING EMAIL... ==========\n")

try:

    response = client.responses.parse(

        model="openai/gpt-oss-20b",

        instructions="""
You are an AI Email Copilot.

Your task is to write a complete email based only on
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
- Be clear, natural, professional, and well-structured.

============================================================
CONTENT PRESERVATION RULES
============================================================

- Use only information provided by the user.
- Do not invent facts or details.
- Do not add statistics.
- Do not add dates.
- Do not add names.
- Do not add events.
- Do not add experiences.
- Do not add policies.
- Do not add reasons that the user did not provide.
- Do not add claims that the user did not provide.
- Do not assume missing information.

IMPORTANT:

Do not add promises, commitments, intentions, actions,
or assurances that the user did not explicitly provide.

For example, do NOT automatically add statements such as:

- "I will catch up on the missed work."
- "I will make sure to complete the work."
- "I will complete the coursework soon."
- "I assure you that..."
- "I promise that..."

unless the user explicitly provided that information.

Do not add new requests or demands that the user did not make.

Do not change the meaning of the user's request.

If information is missing, simply write the email
without inventing or filling in the missing information.

============================================================
WHAT YOU ARE ALLOWED TO DO
============================================================

You may:

- Correct grammar.
- Correct spelling.
- Improve sentence structure.
- Improve clarity.
- Make the email sound natural.
- Make the email professional.
- Rephrase the user's information.
- Use normal email greetings and closings.

However:

Do not introduce new factual claims,
new commitments, or new meaning.

Preserve the original meaning of the user's information.

============================================================
OUTPUT REQUIREMENTS
============================================================

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

    print("\nError: AI did not return a valid email.")

    exit()


# ------------------------------------------------------------
# Validate subject
# ------------------------------------------------------------

if not email.subject.strip():

    print("\nError: Generated email has no subject.")

    exit()


# ------------------------------------------------------------
# Validate body
# ------------------------------------------------------------

if not email.body.strip():

    print("\nError: Generated email has no body.")

    exit()


# ============================================================
# OUTPUT LENGTH GUARDRAILS
# ============================================================

MAX_SUBJECT_LENGTH = 150
MAX_BODY_LENGTH = 5000


if len(email.subject) > MAX_SUBJECT_LENGTH:

    print("\nError: Generated subject is too long.")

    exit()


if len(email.body) > MAX_BODY_LENGTH:

    print("\nError: Generated email body is too long.")

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
