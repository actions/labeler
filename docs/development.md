# Development Handbook

This project is written in [TypeScript](https://www.typescriptlang.org/), a typed variant of JavaScript, and we use [Prettier](https://prettier.io/) to get a consistent code style.

Because of how GitHub Actions are run, the source code of this project is transpiled from TypeScript into JavaScript. The transpiled code (found in `lib/`) is subsequently compiled using [NCC](https://github.com/vercel/ncc/blob/master/readme.md) (found in `dist/`) to avoid having to include the `node_modules/` directory in the repository.
