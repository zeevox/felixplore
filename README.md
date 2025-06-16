# Felixplore

**A new tool to explore the _Felix_ newspaper archive**

Also check out [`tupsar`](https://github.com/zeevox/tupsar), the tool used to digitise the newspaper archive in the first place.

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

If you're developing remotely, you can open an SSH tunnel

to forward port 5173 from the remote server to your local machine:

```bash
ssh -L 5173:localhost:5173 user@your-server
```

Replace `user@your-server` with your actual SSH username and server address.

## Deployment

To deploy a production version of the app:

```bash
docker compose up --build --pull always --detach
```

## Pre-commit Hooks

This project uses [pre-commit](https://pre-commit.com) to run checks and format code before each commit. To get started:

```bash
# Install pre-commit (if not already installed)
uv tool install pre-commit

# Install the Git hooks
pre-commit install

# (Optional) Run hooks on all files initially
pre-commit run --all-files
```

The pre-commit hooks include:

- Remove trailing whitespace and fix end-of-file markers
- Validate YAML files
- Format YAML, JSON, JavaScript, TypeScript, Svelte, CSS, HTML, and Markdown files with Prettier
- Run ESLint auto-fix on JavaScript, TypeScript, and Svelte files
- Type-check TypeScript and Svelte files with `npm run check` (via svelte-check)
