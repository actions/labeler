# Pull Request Labeler

[![Basic validation](https://github.com/actions/labeler/actions/workflows/basic-validation.yml/badge.svg?branch=main)](https://github.com/actions/labeler/actions/workflows/basic-validation.yml)

Automatically label new pull requests based on the paths of files being changed or the branch name.

## Usage

### Create `.github/labeler.yml`

Create a `.github/labeler.yml` file with a list of labels and config options to match and apply the label.

The key is the name of the label in your repository that you want to add (eg: "merge conflict", "needs-updating") and the value is a match object.

#### Match Object

The match object allows control over the matching options, you can specify the label to be applied based on the files that have changed or the name of either the base branch or the head branch. For the changed files options you provide a [path glob](https://github.com/isaacs/minimatch#minimatch), and for the branches you provide a regexp to match against the branch name.

The base match object is defined as:
```yml
- changed-files: ['list', 'of', 'globs']
- base-branch: ['list', 'of', 'regexps']
- head-branch: ['list', 'of', 'regexps']
```

There are two top level keys of `any` and `all`, which both accept the same config options:
```yml
- any:
  - changed-files: ['list', 'of', 'globs']
  - base-branch: ['list', 'of', 'regexps']
  - head-branch: ['list', 'of', 'regexps']
- all:
  - changed-files: ['list', 'of', 'globs']
  - base-branch: ['list', 'of', 'regexps']
  - head-branch: ['list', 'of', 'regexps']
```

One or all fields can be provided for fine-grained matching.
The fields are defined as follows:
* `all`: all of the provided options must match in order for the label to be applied
* `any`: if any of the provided options match then a label will be applied
* `base-branch`: match a regexp against the base branch name
* `changed-files`: match a glob against the changed paths
* `head-branch`: match a regexp against the head branch name

If a base option is provided without a top-level key then it will default to `any`. More specifically, the following two configurations are equivalent:
```yml
label1:
- changed-files: example1/*
```
and
```yml
label1:
- any:
  - changed-files: ['example1/*']
```

From a boolean logic perspective, top-level match objects are `AND`-ed together and individual match rules within an object are `OR`-ed. If path globs are combined with `!` negation, you can write complex matching rules.

#### Basic Examples

```yml
# Add 'label1' to any changes within 'example' folder or any subfolders
label1:
- changed-files: example/**/*

# Add 'label2' to any file changes within 'example2' folder
label2:
- changed-files: example2/*

# Add label3 to any change to .txt files within the entire repository. Quotation marks are required for the leading asterisk
label3:
- changed-files: '**/*.txt'

# Add 'label4' to any PR where the head branch name starts with 'example4'
label4:
- head-branch: '^example4'

# Add 'label5' to any PR where the base branch name starts with 'example5'
label5:
- base-branch: '^example5'
```

#### Common Examples

```yml
# Add 'repo' label to any root file changes
repo:
- changed-files: '*'

# Add '@domain/core' label to any change within the 'core' package
'@domain/core':
- changed-files:
  - package/core/*
  - package/core/**/*

# Add 'test' label to any change to *.spec.js files within the source dir
test:
- changed-files: src/**/*.spec.js

# Add 'source' label to any change to src files within the source dir EXCEPT for the docs sub-folder
source:
- changed-files:
  - any: ['src/**/*', '!src/docs/*']

# Add 'frontend` label to any change to *.js files as long as the `main.js` hasn't changed
frontend:
- any:
  - changed-files: ['src/**/*.js']
- all:
  - changed-files: ['!src/main.js']

 # Add 'feature' label to any PR where the head branch name starts with `feature` or has a `feature` section in the name
feature:
 - head-branch: ['^feature', 'feature']

 # Add 'release' label to any PR that is opened against the `main` branch
release:
 - base-branch: 'main'
```

### Create Workflow

Create a workflow (eg: `.github/workflows/labeler.yml` see [Creating a Workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file)) to utilize the labeler action with content:

```yml
name: "Pull Request Labeler"
on:
- pull_request_target

jobs:
  triage:
    permissions:
      contents: read
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
    - uses: actions/labeler@v5
```

#### Inputs

Various inputs are defined in [`action.yml`](action.yml) to let you configure the labeler:

| Name | Description | Default |
| - | - | - |
| `repo-token` | Token to use to authorize label changes. Typically the GITHUB_TOKEN secret, with `contents:read` and `pull-requests:write` access | `github.token` |
| `configuration-path` | The path to the label configuration file | `.github/labeler.yml` |
| `sync-labels` | Whether or not to remove labels when matching files are reverted or no longer changed by the PR | `false`|

# Contributions

Contributions are welcome! See the [Contributor's Guide](CONTRIBUTING.md).
