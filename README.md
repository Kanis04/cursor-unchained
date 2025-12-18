# Cursor Unchained

![Cursor Unchained Logo](/assets/cursor-unchained.png)

This project aims to reverse engineer [Cursor's Tab complete](https://cursor.com/docs/tab/overview) to enable it to be used in other IDEs.

Cursor's Tab complete is known to be the best tab complete on the market, however it's limited to only being available in Cursor which itself is tied down by Vscode's long history of technical debt. Cursor is focused on fixing these problems but why don't we unshackle the beast and bring the best tab complete to all!

Example Tab Completion

![Example Tab Completion](/assets/streamCppExample.png)

Example Refresh Tab Context [WIP]
(Workspace paths are encoded)

![Example Refresh Tab Context](/assets/refreshTabContextExample.png)

## Requirements

- Cursor Account

## Overview

**StreamCpp**: the main completion service that is used to send tab completion requests to the Cursor API.

**RefreshTabContext**: a context refresh service that is used to refresh the tab context which I believe is used to provide StreamCpp with more context for the tab completion request via codeblocks.

## Environment Variables (StreamCpp)

note: this is obviously a pain and quite brittle, I should find a better way to do this in the future.

1. Create a new file called `.env` in the root of the project

2. Open Cursor

3. Cmd + Shift + P to open the Command Palette

4. Developer: Open Developer Tools for Extension Host > LocalProcess pid: <pid>

5. Navigate to the Network tab

6. Trigger the tab completion request: in the Network tab this will appear as StreamCpp

7. Copy the bearer token, x-request-id, x-session-id and x-cursor-client-version

8. Copy the values and paste them into the `.env` file

## Usage (StreamCpp)

1. Run `bun run streamCpp` to send a tab completion request

2. The response will be logged to the console

3. Edit payload.currentFile.contents to the code you want to tab complete

## Environment Variables (RefreshTabContext)

This requires looking through and debugging the source code via Help Tab > Toggle Developer Tools.
It's kind of a pain so I'll add it later.

## Usage (RefreshTabContext)

1. Run `bun run refreshTabContext` to send a refresh tab context request

2. The response will be logged to the console
