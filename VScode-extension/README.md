# DevAid

DevAid is an AI-powered coding assistant for Visual Studio Code, powered by Claude.

## Features

- Interactive AI chatbot in the VS Code sidebar.
- Ask questions about the currently opened repository.
- Explore files and understand existing code.
- Search repository contents using natural language.
- Get AI-generated explanations of functions and project structure.

## Requirements

- Visual Studio Code 1.106.0 or newer.
- Python 3.11 or newer.
- A locally configured DevAid Python backend.
- An Anthropic API key configured in the backend environment.

## Configuration

Set `devaid.backendPath` in VS Code User Settings to the absolute path of your DevAid Python backend project.

Example:

`/Users/your-username/DevAid`

## Current Status

DevAid is under active development. Repository exploration and code explanation are supported. Additional features are planned.