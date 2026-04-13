---
name: "Codex CLI"
description: "OpenAI's terminal coding agent for reading code, editing files, and running commands with configurable approvals."
category: "Terminal Coding Agent"
url: "https://openai.com/codex"
github: "https://github.com/openai/codex"
tags: ["agents", "terminal", "coding-agent", "openai", "codex", "cli"]
features:
  - Terminal-first coding workflow
  - Approval modes for reads, edits, and command execution
  - Local file and shell access
  - Multimodal task input support
useCases:
  - Codebase navigation
  - Bug fixing
  - Refactoring
  - Test and build iteration
alternatives:
  - Claude Code
  - Gemini CLI
  - Aider
updatedAt: "2026-04-13"
---

# Codex CLI

Codex CLI is OpenAI's terminal coding agent for software tasks that need code understanding, file edits, and command execution from inside a local repository.

## What It Is Good At

- Explaining unfamiliar codebases from the terminal
- Making targeted edits across multiple files
- Iterating on fixes by running tests and shell commands
- Working with explicit approval boundaries instead of unrestricted autonomy

## Operating Style

Codex CLI fits teams that want a local agent with a strong review loop. It is especially useful when you want the model to stay close to the shell, show its work, and respect repo-specific constraints.

## Notes

Use Codex CLI when the main workflow is terminal-native engineering work rather than browser-first chat. It is best paired with version control, narrow task scopes, and clear repo instructions.
