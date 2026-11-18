# Tools that Claude can request
TOOLS = [
    {
        "name": "list_files",
        "description": (
            "List the files in the developer's authorized repository. "
            "Use this tool to understand the repository structure."
            "Don't include sensitive files"
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
        {
        "name": "read_file",
        "description": (
            "Read the contents of a specific file in the authorized repository. "
            "Use this when you need to understand source code."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path relative to the authorized repository root."
                }
            },
            "required": ["file_path"]
        }
},
        {
            "name": "search_code",
            "description": (
                "Search the authorized repository for a keyword or code pattern. "
                "Returns matching filenames, line numbers, and snippets."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Keyword or code text to search for."
                }
            },
            "required": ["query"]
    }
}
]