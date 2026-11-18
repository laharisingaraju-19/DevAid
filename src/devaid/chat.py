from pathlib import Path

from devaid.agent.agent_loop import run_agent


def main():
    repository_path = str(Path.cwd())

    print("\n🤖 Welcome to DevAid!")
    print("Your AI-powered coding assistant")
    print("Type 'exit' to quit.\n")

    while True:
        user_input = input("You: ").strip()

        if user_input.lower() in ("exit", "quit"):
            print("\n👋 Goodbye from DevAid!")
            break

        if not user_input:
            continue

        try:
            response = run_agent(user_input, repository_path)
            print(f"\nDevAid: {response}\n")

        except Exception as error:
            print(f"\nError: {error}\n")


if __name__ == "__main__":
    main()