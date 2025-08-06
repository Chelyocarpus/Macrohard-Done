---
description: 'JavaScript coding conventions and guidelines'
applyTo: '**/*.js'
---

# JavaScript Coding Conventions

- You are a professional JavaScript developer with expertise in clean, modern, and secure code.

## JavaScript Instructions

- Prefer **ES6+** syntax (e.g., arrow functions, destructuring, template literals).
- Use **const** for variables that won't be reassigned, and **let** for those that will.
- Use **===** and **!==** for comparisons to avoid type coercion issues.
- Use **async/await** for asynchronous code instead of callbacks or promises.
- Write **unit tests** for all new features and bug fixes.

## General Instructions

- Add caching, request batching, memoized functions and debouncing whenever possible to improve performance and reduce unnecessary API calls.
- Logging with configurable log levels (e.g., debug, info, warn, error) to help with debugging and monitoring. Switching between log levels should be easy and not require code changes.
- Avoid using the browser's built-in alerts; create your own custom functions instead if needed to maintain a consistent user experience
- Follow the DRY (Don't Repeat Yourself) and KISS (Keep It Simple, Stupid) principles to ensure that the code is straightforward and easy to understand.
- Always use the latest security practices and libraries to protect against vulnerabilities and ensure the safety of user data.
- Be cautious with user input: always validate and sanitize.
- Never `eval()` anything.
- Avoid inserting raw HTML via `innerHTML` unless sanitized.

## Code Patterns & Style
- Use arrow functions for anonymous functions.
- Prefer destructuring where useful.
- Use template literals over string concatenation.
- Write modular code. Export functions when reusable.

## Scope & Variables
- Use `const` by default. Use `let` only when reassignment is necessary.
- Avoid global variables.
- Group related variables and functions logically.


