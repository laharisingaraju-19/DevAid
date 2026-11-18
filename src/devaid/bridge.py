import json
import sys

from devaid.agent.agent_loop import run_agent


def main():
    for line in sys.stdin:
        try:
            request = json.loads(line)

            prompt = request["prompt"]
            repository_path = request["repository_path"]

            response = run_agent(prompt, repository_path)

            result = {
                "type": "response",
                "text": response
            }

        except Exception as error:
            result = {
                "type": "error",
                "text": str(error)
            }

        print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()