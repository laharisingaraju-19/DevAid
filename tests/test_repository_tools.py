from devaid.tools.repository_tools import list_files,read_file,search_code
import pytest

# Tests list_files()
def test_list_files(tmp_path):
    # Create a temporary Python file.
    sample_file = tmp_path / "example.py"
    sample_file.write_text("print('Hello DevAid')")

    # Call our repository exploration tool.
    result = list_files(str(tmp_path))

    # Verify the expected file appears.
    assert "example.py" in result

# Tests read_file()
def test_read_file(tmp_path):
    # Create a temporary Python file.
    sample_file = tmp_path / "hello.py"
    sample_file.write_text("print('Hello DevAid')")

    # Read the file using DevAid.
    result = read_file(str(tmp_path), "hello.py")

    # Verify that the returned content is correct.
    assert result == "print('Hello DevAid')"

def test_read_file_outside_repository(tmp_path):
    # Create an authorized repository.
    repo = tmp_path / "my_repo"
    repo.mkdir()

    # Create a file OUTSIDE the authorized repository.
    secret_file = tmp_path / "secret.txt"
    secret_file.write_text("Confidential information")

    # Attempt to access the file using path traversal.
    with pytest.raises(ValueError):
        read_file(str(repo), "../secret.txt")

def test_search_code(tmp_path):
    # Create a sample Python file.
    sample_file = tmp_path / "calculator.py"

    sample_file.write_text(
        "def add(a, b):\n"
        "    return a + b\n"
        "\n"
        "def subtract(a, b):\n"
        "    return a - b\n"
    )

    # Search for the function name.
    results = search_code(str(tmp_path), "add")

    # Verify that exactly one match was found.
    assert len(results) == 1

    # Verify the filename.
    assert results[0]["file"] == "calculator.py"

    # Verify the line number.
    assert results[0]["line"] == 1

    # Verify the matching code.
    assert results[0]["content"] == "def add(a, b):"