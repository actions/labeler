# Pull Request Labeler

Pull request labeler triages PRs based on the paths that are modified in the PR.

To use, create a `.github/labeler.yml` file with a list of labels and [minimatch](https://github.com/isaacs/minimatch)
globs to match to apply the label.

Example:
```
label1:
- example1/**/*

label2: example2/*

label3:
- example3/*
- example3/**/*.yml
```
Where `"label1"` is the name of the label on your repository that you want to add (eg: "merge conflict", "needs-updating") and `"example1/**/*"` is the path of the changed files.


Then create a workflow (eg: `.github/workflows/label.yml` see [Creating a Workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file)) utilizing the labeler action, granting access to the GITHUB_TOKEN so the action can make calls to GitHub's rest API:
```
name: "Pull Request Labeler"
on:
- pull_request

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/labeler@v2
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
```
