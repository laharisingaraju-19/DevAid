from pathlib import Path

from devaid.tools.repository_tools import (
    list_files,
    read_file,
    search_code,
)

def execute_tool(
    tool_name: str,
    tool_input: dict,
    repository_path: str
):
    """
    Execute a repository tool requested by Claude.
    """

    # The application chooses the authorized repository.
    repo = Path(repository_path).resolve(strict=True)

    if not repo.is_dir():
        raise ValueError("Invalid repository directory")

    if not isinstance(tool_input, dict):
        raise ValueError("Tool input must be an object")

    # Tool 1: List repository files
    if tool_name == "list_files":
        if tool_input:
            raise ValueError("list_files accepts no arguments")

        return list_files(str(repo))

    # Tool 2: Read a specific file
    elif tool_name == "read_file":
        file_path = tool_input.get("file_path")

        if not isinstance(file_path, str) or not file_path:
            raise ValueError("A valid file_path is required")

        return read_file(str(repo), file_path)

    # Tool 3: Search repository code
    elif tool_name == "search_code":
        query = tool_input.get("query")

        if not isinstance(query, str) or not query:
            raise ValueError("A valid search query is required")

        return search_code(str(repo), query)

    # Reject unknown tools
    else:
        raise ValueError(f"Unknown tool: {tool_name}")