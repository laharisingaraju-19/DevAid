from pathlib import Path 

# Tool 1
def list_files(repository_path: str) -> list[str]:
    """
    Return a sorted list of files inside a repository,
    excluding hidden files and common dependency folders.
    """

    repo = Path(repository_path).resolve()

    # Verify that the repository exists.
    if not repo.is_dir():
        raise ValueError("Invalid repository directory")

    excluded_directories = {
        ".git",
        ".venv",
        "venv",
        "__pycache__",
        "node_modules",
    }

    files = []

    # Recursively explore the repository.
    for path in repo.rglob("*"):
        relative_path = path.relative_to(repo)

        # Reject paths that resolve outside the repository.
        if not path.resolve().is_relative_to(repo):
            continue

        # Reject paths containing symbolic links.
        if any(
            (repo.joinpath(*relative_path.parts[:i])).is_symlink()
            for i in range(1, len(relative_path.parts) + 1)
        ):
         continue

        # Skip generated Python package metadata directories.
        if any(part.endswith(".egg-info") for part in relative_path.parts):
             continue

        # Skip hidden files and directories.
        if any(part.startswith(".") for part in relative_path.parts):
            continue

        # Skip dependency and cache directories.
        if any(part in excluded_directories for part in relative_path.parts):
            continue

        # Include only regular files, not symlinks.
        if path.is_file() and not path.is_symlink():
            files.append(str(relative_path))

    return sorted(files)
# Tool 2
def read_file(repository_path: str, file_path: str) -> str:
    """
    Read a file from the repository while enforcing
    basic security restrictions.
    """

    repo = Path(repository_path).resolve()
    requested_path = Path(file_path)

    # Verify the repository exists.
    if not repo.is_dir():
        raise ValueError("Invalid repository directory")

    # Require a relative path.
    if requested_path.is_absolute():
        raise ValueError("Absolute file paths are not allowed")

    # Prevent hidden files and generated/dependency directories.
    excluded_directories = {
        ".git",
        ".venv",
        "venv",
        "__pycache__",
        "node_modules",
    }

    if any(
        part.startswith(".")
        or part in excluded_directories
        or part.endswith(".egg-info")
        for part in requested_path.parts
    ):
        raise ValueError("Access to this file is not allowed")

    # Resolve the requested file location.
    target = (repo / requested_path).resolve()

    # Prevent access outside the repository.
    if not target.is_relative_to(repo):
        raise ValueError("File is outside the repository")

    # Reject symlinks in any component of the path.
    current = repo
    for part in requested_path.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("Symbolic links are not allowed")

    if not target.is_file():
        raise FileNotFoundError("File does not exist")

    # Avoid reading extremely large files.
    max_file_size = 100_000  # 100 KB

    if target.stat().st_size > max_file_size:
        raise ValueError("File exceeds the maximum allowed size")

    # Read source code as text.
    return target.read_text(encoding="utf-8")

# Tool 3
def search_code(repository_path: str, query: str) -> list[dict]:
    """
    Search repository files for a keyword and return
    matching filenames, line numbers, and code snippets.
    """

    if not query:
        raise ValueError("Search query cannot be empty")

    results = []

    # Reuse our existing repository exploration tool.
    files = list_files(repository_path)

    for file_path in files:
        try:
            # Reuse read_file() for path and size validation.
            content = read_file(repository_path, file_path)

        except (ValueError, OSError, UnicodeError):
            # Skip files that cannot be safely read as text.
            continue

        for line_number, line in enumerate(content.splitlines(), start=1):

            if query.lower() in line.lower():
                results.append({
                    "file": file_path,
                    "line": line_number,
                    "content": line.strip()[:200]
                })

            # Limit results to avoid excessive output.
            if len(results) >= 50:
                return results

    return results

# Manual Testing
if __name__ == "__main__":
    repository = input("Enter repository path: ")

    for filename in list_files(repository):
        print(filename)