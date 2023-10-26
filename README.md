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
* `base-branch`: match regexps against the base branch name
* `changed-files`: match glob patterns against the changed paths
* `head-branch`: match regexps against the head branch name

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

From a boolean logic perspective, top-level match objects, and options within `all`  are `AND`-ed together and individual match rules within the `any` object are `OR`-ed. If path globs are combined with `!` negation, you can write complex matching rules.

> ⚠️ This action uses [minimatch](https://www.npmjs.com/package/minimatch) to apply glob patterns.
> For historical reasons, paths starting with dot (e.g. `.github`) are not matched by default.
> You need to set `dot: true` to change this behavior.
> See [Inputs](#inputs) table below for details.

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

Create a workflow (e.g. `.github/workflows/labeler.yml` see [Creating a Workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file)) to utilize the labeler action with content:

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

| Name                 | Description                                                                                                                                                              | Default               |
|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| `repo-token`         | Token to use to authorize label changes. Typically the GITHUB_TOKEN secret                                                                                               | `github.token`        |
| `configuration-path` | The path to the label configuration file. If the file doesn't exist at the specified path on the runner, action will read from the source repository via the Github API. | `.github/labeler.yml` |
| `sync-labels`        | Whether or not to remove labels when matching files are reverted or no longer changed by the PR                                                                          | `false`               |
| `dot`                | Whether or not to auto-include paths starting with dot (e.g. `.github`)                                                                                                  | `false`               |
| `pr-number`          | The number(s) of pull request to update, rather than detecting from the workflow context                                                                                 | N/A                   |

##### Using `configuration-path` input together with the `@actions/checkout` action
You might want to use action called [@actions/checkout](https://github.com/actions/checkout) to upload label configuration file onto the runner from the current or any other repositories. See usage example below:

```yml
    steps:
    - uses: actions/checkout@v4 # Uploads repository content to the runner
      with:
        repository: "owner/repositoryName" # The one of the available inputs, visit https://github.com/actions/checkout#readme to find more
    - uses: actions/labeler@v4
```

##### Peculiarities of using the `dot` input

When `dot` is disabled, and you want to include _all_ files in a folder:

```yml
label1:
- path/to/folder/**/*
- path/to/folder/**/.*
```

If `dot` is enabled:

```yml
label1:
- path/to/folder/**
```

##### Example workflow specifying Pull request numbers

```yml
name: "Label Previous Pull Requests"
on:
  schedule:
    - cron: "0 1 * * 1"

jobs:
  triage:
    permissions:
      contents: read
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
    
    # Label PRs 1, 2, and 3
    - uses: actions/labeler@v4
      with:        
        pr-number: |
          1
          2
          3
```

**Note:** in normal usage the `pr-number` input is not required as the action will detect the PR number from the workflow context.

#### Outputs 

Labeler provides the following outputs:  

| Name         | Description                                               |
|--------------|-----------------------------------------------------------|
| `new-labels` | A comma-separated list of all new labels                  |
| `all-labels` | A comma-separated list of all labels that the PR contains |

The following example performs steps based on the output of labeler:
```yml
name: "My workflow"
on:
- pull_request_target

jobs:
  triage:
    permissions:
      contents: read
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
    - id: label-the-PR
      uses: actions/labeler@v4
      
    - id: run-frontend-tests
      if: contains(steps.label-the-PR.outputs.all-labels, 'frontend')
      run: |
        echo "Running frontend tests..."
        # Put your commands for running frontend tests here
  
    - id: run-backend-tests
      if: contains(steps.label-the-PR.outputs.all-labels, 'backend')
      run: |
        echo "Running backend tests..."
        # Put your commands for running backend tests here
```

## Permissions

In order to add labels to pull requests, the GitHub labeler action requires write permissions on the pull-request. However, when the action runs on a pull request from a forked repository, GitHub only grants read access tokens for `pull_request` events, at most. If you encounter an `Error: HttpError: Resource not accessible by integration`, it's likely due to these permission constraints. To resolve this issue, you can modify the `on:` section of your workflow to use
[`pull_request_target`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target) instead of `pull_request` (see example [above](#create-workflow)). This change allows the action to have write access, because `pull_request_target` alters the [context of the action](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target) and safely grants additional permissions. Refer to the [GitHub token permissions documentation](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token) for more details about access levels and event contexts.

## Contributions

Contributions are welcome! See the [Contributor's Guide](CONTRIBUTING.md).
