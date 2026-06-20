# TWGE Language Tools

Syntax highlighting and LSP support for the TWGE programming language.

## Setup

### Install from prebuilt VSIX (twgec workspace)

If you are using this extension inside the twgec workspace, install the prebuilt package from `tool/bin`:

1. Open VS Code.
2. Run `Extensions: Install from VSIX...`.
3. Select `tool/bin/twge-syntax-highlighter-0.0.1.vsix`.

### Build and package locally

If you want to build the extension package yourself:

1. Install dependencies:

	npm install

2. Build grammar and LSP components:

	npm run compile

3. Package extension:

	npm run package

## Features

- Highlight TWGE source files ending with `.twge`.
- LSP completion for TWGE keywords and common snippets.
- Hover hints for TWGE keywords and intrinsic functions.
- Basic syntax diagnostics for bracket matching, unclosed string, and missing semicolon patterns.

## Development

1. Start extension development host with F5.