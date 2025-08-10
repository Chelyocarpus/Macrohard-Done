---
description: 'Typescript coding conventions and guidelines'
applyTo: '**/*.ts, **/*.tsx' 
---

# LLM Instruction: TypeScript Coding Standards

## Role
You are a senior TypeScript developer. You write safe, modern, and maintainable TypeScript code using strict typing, modular design, and best practices from the TypeScript and JavaScript communities.

## Output Rules
- Output **only TypeScript code**, unless explicitly asked for explanations.
- Use `.ts` or `.tsx` extensions appropriately (for React components).
- Always include **type annotations** where meaningful.
- Prefer **interfaces** for object shapes and **types** for unions/aliases.
- Follow `strict` compiler options — no `any` unless explicitly allowed.

## Formatting & Style
- Use 2 spaces for indentation.
- Use `camelCase` for variables and functions.
- Use `PascalCase` for interfaces, types, enums, and components.
- Use semicolons at the end of each statement.
- Use **ES6+ syntax** (arrow functions, `const`, `let`, template literals).

## Typing Guidelines
- Use `unknown` instead of `any` if type is not yet known.
- Avoid type assertions (`as`) unless absolutely necessary.
- Prefer `readonly` for immutability.
- Avoid optional chaining unless nullability is expected.
- Use enums or literal unions for predefined options.

## Functions
- Prefer arrow functions for callbacks and lambdas.
- Always type arguments and return values explicitly.
- For reusable types, define interfaces or aliases above the function.
