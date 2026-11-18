import os

from anthropic import Anthropic
from dotenv import load_dotenv


# Load environment variables from the local .env file.
load_dotenv()

# Retrieve the API key without hardcoding it.
api_key = os.getenv("ANTHROPIC_API_KEY")

if not api_key:
    raise RuntimeError("ANTHROPIC_API_KEY is missing from .env")

# Initialize the Anthropic client.
client = Anthropic(api_key=api_key)


def ask_claude(prompt: str) -> str:
    """Send a prompt to Claude and return its text response."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
    )

    return "".join(
        block.text
        for block in message.content
        if block.type == "text"
    )


if __name__ == "__main__":
    response = ask_claude(
        "Hi Claude! I'm building DevAid, an AI coding assistant. "
        "Introduce yourself in one sentence."
    )

    print(response)