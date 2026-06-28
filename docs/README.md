# Forma Documentation

Technical documentation for the Forma authenticated app shell.

> Forma was reset to an auth-only shell. The former finance/workspace docs
> (forecasting, calculation logic, feature flags, monitoring) were removed along
> with their features. See the root [CHANGELOG](../CHANGELOG.md).

## Index

- **[Developer Quickstart](./DEVELOPER_QUICKSTART.md)** — local setup
- Root **[README](../README.md)** — overview, structure, scripts, environment
- Root **[CHANGELOG](../CHANGELOG.md)** — history and the reset notes

## Steering documents

`.kiro/steering/` holds conventions (`product.md`, `tech.md`, `structure.md`,
`testing.md`, `code-quality.md`). Note that several steering and spec files still
describe the former finance product and are kept only as historical context.

## Development workflow

1. **Setup**: follow the [Developer Quickstart](./DEVELOPER_QUICKSTART.md)
2. **Develop**: `npm run dev`
3. **Verify**: `npm run type-check`, `npm run lint`, `npm run test`
