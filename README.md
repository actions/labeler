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
Then create a workflow:
```
name: "Pull Request Labeler"
on: 
- pull-request

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
    - uses: bbq-beets/labeler@labeler
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
```
