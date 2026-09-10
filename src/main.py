import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

client = OpenAI(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1"
)


# -----------------------------
# Collect user information
# -----------------------------

print("\n========== AI EMAIL COPILOT ==========\n")

purpose = input("What type of email do you want to write?\n> ")

recipient = input("\nWho are you writing to?\n> ")

context = input("\nWhat is the context?\n> ")

important_points = input("\nWhat important points should be included?\n> ")

tone = input("\nWhat tone should the email have?\n> ")

formality = input("\nHow formal should the email be?\n> ")

length = input("\nHow long should the email be?\n> ")

language = input("\nWhat language should the email be in?\n> ")


# -----------------------------
# Build the prompt
# -----------------------------

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


# -----------------------------
# Call Groq
# -----------------------------

print("\n========== GENERATING EMAIL... ==========\n")

response = client.responses.create(
    model="openai/gpt-oss-20b",
    input=prompt
)

print(response.output_text)