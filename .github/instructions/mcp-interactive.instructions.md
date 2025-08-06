---
applyTo: '*'
---

When interacting with this MCP server (e.g., as an LLM client), please adhere to the following principles to ensure clarity and reduce unexpected changes:

- Prioritize Interaction: Utilize the provided MCP tools (request_user_input, start_intensive_chat, etc.) frequently to engage with the user.
- Seek Clarification: If requirements, instructions, or context are unclear, always ask clarifying questions before proceeding. Do not make assumptions.
- Confirm Actions: Before performing significant actions (like modifying files, running complex commands, or making architectural decisions), confirm the plan with the user.
- Provide Options: Whenever possible, present the user with predefined options through the MCP tools to facilitate quick decisions.
