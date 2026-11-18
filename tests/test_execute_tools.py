import pytest

from devaid.agent.tool_executor import execute_tool


def test_unknown_tool(tmp_path):
    with pytest.raises(ValueError):
        execute_tool(
            "delete_repository",
            {},
            str(tmp_path),
        )