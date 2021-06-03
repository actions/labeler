## Contributing

[fork]: https://github.com/actions/labeler/fork
[pr]: https://github.com/actions/labeler/compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Contributions to this project are [released](https://help.github.com/articles/github-terms-of-service/#6-contributions-under-repository-license) to the public under the [project's open source license](LICENSE).

Please note that this project is released with a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## Found a bug?

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/actions/labeler/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/actions/labeler/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or a **reproducible test case** demonstrating the expected behavior that is not occurring.
- If possible, use the relevant bug report templates to create the issue.

## What should I know before submitting a pull request or issue

This project is written in [TypeScript](https://www.typescriptlang.org/), a typed variant of JavaScript, and we use [Prettier](https://prettier.io/) to get a consistent code style.

Because of how GitHub Actions are run, the source code of this project is transpiled from TypeScript into JavaScript. The transpiled code (found in `lib/`) is subsequently compiled using [NCC](https://github.com/vercel/ncc/blob/master/readme.md) (found in `dist/`) to avoid having to include the `node_modules/` directory in the repository.

## Submitting a pull request

1. [Fork][fork] and clone the repository
1. Configure and install the dependencies: `npm install`
1. Create a new branch: `git checkout -b my-branch-name`
1. Make your change, add tests, and make sure the tests still pass: `npm run test`
1. Make sure your code is correctly formatted: `npm run format`
1. Update `dist/index.js` using `npm run build`. This creates a single javascript file that is used as an entrypoint for the action
1. Push to your fork and [submit a pull request][pr]
1. Pat yourself on the back and wait for your pull request to be reviewed and merged.

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Write tests.
- Keep your change as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.

## Releasing a new version

All the concepts from [the actions/toolkit release docs](https://github.com/actions/toolkit/blob/main/docs/action-versioning.md) apply. Please read that first!

Once the changes are merged into main, a repo maintainer should:

1. Bump the package version by running [`npm version [major|minor|patch]`](https://docs.npmjs.com/cli/v7/commands/npm-version). We adhere to [SemVer 2.0](https://semver.org/spec/v2.0.0.html) to the best of our ability. Commit the changes to `package.json` and `package-lock.json` and push them to main.
1. [Draft a new release](https://github.com/actions/labeler/releases/new) pointing to the ref of the version bump you just made. Publish the release to the marketplace when complete.
1. Finally: update the corresponding "major tag" (v1, v2, v3, etc) to point to the specific ref of the release you just made. For example, if we just released `v1.1.0`, we would rewrite the `v1` tag like this:

```
git tag -fa v1 v1.1.0 -m "Update v1 tag to point to v1.1.0"
git push origin v1 --force
```

## Licensed

This repository uses a tool called [Licensed](https://github.com/github/licensed) to verify third party dependencies. You may need to locally install licensed and run `licensed cache` to update the dependency cache if you install or update a production dependency. If licensed cache is unable to determine the dependency, you may need to modify the cache file yourself to put the correct license. You should still verify the dependency, licensed is a tool to help, but is not a substitute for human review of dependencies.

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)
- [Writing good commit messages](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)

Thanks! :heart: :heart: :heart:

GitHub Actions Team :octocat:
