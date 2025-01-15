# Pull Request Labeler

[![Basic validation](https://github.com/actions/labeler/actions/workflows/basic-validation.yml/badge.svg?branch=main)](https://github.com/actions/labeler/actions/workflows/basic-validation.yml)

Automatically label new pull requests based on the paths of files being changed or the branch name.

## Breaking changes in V5
1) The ability to apply labels based on the names of base and/or head branches was added ([#186](https://github.com/actions/labeler/issues/186) and [#54](https://github.com/actions/labeler/issues/54)). The match object for changed files was expanded with new combinations in order to make it more intuitive and flexible ([#423](https://github.com/actions/labeler/issues/423) and [#101](https://github.com/actions/labeler/issues/101)). As a result, the configuration file structure was significantly redesigned and is not compatible with the structure of the previous version. Please read the documentation below to find out how to adapt your configuration files for use with the new action version.

2) The bug related to the `sync-labels` input was fixed ([#112](https://github.com/actions/labeler/issues/112)). Now the input value is read correctly.

3) By default, `dot` input is set to `true`. Now, paths starting with a dot (e.g. `.github`) are matched by default.

4) Version 5 of this action updated the [runtime to Node.js 20](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions#runs-for-javascript-actions). All scripts are now run with Node.js 20 instead of Node.js 16 and are affected by any breaking changes between Node.js 16 and 20.

> [!IMPORTANT]
> Before the update to the v5, please check out [this information](#notes-regarding-pull_request_target-event) about the `pull_request_target` event trigger.

## Usage

### Create `.github/labeler.yml`

Create a `.github/labeler.yml` file with a list of labels and config options to match and apply the label.

The key is the name of the label in your repository that you want to add (eg: "merge conflict", "needs-updating") and the value is a match object.

#### Match Object

The match object allows control over the matching options. You can specify the label to be applied based on the files that have changed or the name of either the base branch or the head branch. For the changed files options you provide a [path glob](https://github.com/isaacs/minimatch#minimatch), and for the branches you provide a regexp to match against the branch name.

The base match object is defined as:
```yml
- changed-files: 
  - any-glob-to-any-file: ['list', 'of', 'globs']
  - any-glob-to-all-files: ['list', 'of', 'globs']
  - all-globs-to-any-file: ['list', 'of', 'globs']
  - all-globs-to-all-files: ['list', 'of', 'globs']
- base-branch: ['list', 'of', 'regexps']
- head-branch: ['list', 'of', 'regexps']
```

There are two top-level keys, `any` and `all`, which both accept the same configuration options:
```yml
- any:
  - changed-files:
    - any-glob-to-any-file: ['list', 'of', 'globs']
    - any-glob-to-all-files: ['list', 'of', 'globs']
    - all-globs-to-any-file: ['list', 'of', 'globs']
    - all-globs-to-all-files: ['list', 'of', 'globs']
  - base-branch: ['list', 'of', 'regexps']
  - head-branch: ['list', 'of', 'regexps']
- all:
  - changed-files:
    - any-glob-to-any-file: ['list', 'of', 'globs']
    - any-glob-to-all-files: ['list', 'of', 'globs']
    - all-globs-to-any-file: ['list', 'of', 'globs']
    - all-globs-to-all-files: ['list', 'of', 'globs']
  - base-branch: ['list', 'of', 'regexps']
  - head-branch: ['list', 'of', 'regexps']
```

From a boolean logic perspective, top-level match objects, and options within `all` are `AND`-ed together and individual match rules within the `any` object are `OR`-ed.

One or all fields can be provided for fine-grained matching.
The fields are defined as follows:
- `all`: ALL of the provided options must match for the label to be applied
- `any`: if ANY of the provided options match then the label will be applied
  - `base-branch`: match regexps against the base branch name
  - `head-branch`: match regexps against the head branch name
  - `changed-files`: match glob patterns against the changed paths
    - `any-glob-to-any-file`: ANY glob must match against ANY changed file
    - `any-glob-to-all-files`: ANY glob must match against ALL changed files
    - `all-globs-to-any-file`: ALL globs must match against ANY changed file
    - `all-globs-to-all-files`: ALL globs must match against ALL changed files

If a base option is provided without a top-level key, then it will default to `any`. More specifically, the following two configurations are equivalent:
```yml
Documentation:
- changed-files:
  - any-glob-to-any-file: 'docs/*'
```
and
```yml
Documentation:
- any:
  - changed-files:
    - any-glob-to-any-file: 'docs/*'
```

 If path globs are combined with `!` negation, you can write complex matching rules. See the examples below for more information.

#### Basic Examples

```yml
# Add 'root' label to any root file changes
# Quotation marks are required for the leading asterisk
root:
- changed-files:
  - any-glob-to-any-file: '*'

# Add 'AnyChange' label to any changes within the entire repository
AnyChange:
- changed-files:
  - any-glob-to-any-file: '**'

# Add 'Documentation' label to any changes within 'docs' folder or any subfolders
Documentation:
- changed-files:
  - any-glob-to-any-file: docs/**

# Add 'Documentation' label to any file changes within 'docs' folder
Documentation:
- changed-files:
  - any-glob-to-any-file: docs/*

# Add 'Documentation' label to any file changes within 'docs' or 'guides' folders
Documentation:
- changed-files:
  - any-glob-to-any-file:
    - docs/*
    - guides/*

## Equivalent of the above mentioned configuration using another syntax
Documentation:
- changed-files:
  - any-glob-to-any-file: ['docs/*', 'guides/*']

# Add 'Documentation' label to any change to .md files within the entire repository 
Documentation:
- changed-files:
  - any-glob-to-any-file: '**/*.md'

# Add 'source' label to any change to src files within the source dir EXCEPT for the docs sub-folder
source:
- all:
  - changed-files:
    - any-glob-to-any-file: 'src/**/*'
    - all-globs-to-all-files: '!src/docs/*'

# Add 'feature' label to any PR where the head branch name starts with `feature` or has a `feature` section in the name
feature:
 - head-branch: ['^feature', 'feature']

# Add 'release' label to any PR that is opened against the `main` branch
release:
 - base-branch: 'main'
```

### Create Workflow

Create a workflow (e.g. `.github/workflows/labeler.yml` see [Creating a Workflow file](https://docs.github.com/en/actions/writing-workflows/quickstart#creating-your-first-workflow)) to utilize the labeler action with content:

```yml
name: "Pull Request Labeler"
on:
- pull_request_target

jobs:
  labeler:
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
| `dot`                | Whether or not to auto-include paths starting with dot (e.g. `.github`)                                                                                                  | `true`               |
| `pr-number`          | The number(s) of pull request to update, rather than detecting from the workflow context                                                                                 | N/A                   |

##### Using `configuration-path` input together with the `@actions/checkout` action
You might want to use action called [@actions/checkout](https://github.com/actions/checkout) to upload label configuration file onto the runner from the current or any other repositories. See usage example below:

```yml
    steps:
    - uses: actions/checkout@v4 # Uploads repository content to the runner
      with:
        repository: "owner/repositoryName" # The one of the available inputs, visit https://github.com/actions/checkout#readme to find more
    - uses: actions/labeler@v5
      with:
        configuration-path: 'path/to/the/uploaded/configuration/file'

```

##### Example workflow specifying pull request numbers

```yml
name: "Label Previous Pull Requests"
on:
  schedule:
    - cron: "0 1 * * 1"

jobs:
  labeler:
    permissions:
      contents: read
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
    
    # Label PRs 1, 2, and 3
    - uses: actions/labeler@v5
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
name: "Pull Request Labeler"
on:
- pull_request_target

jobs:
  labeler:
    permissions:
      contents: read
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
    - id: label-the-PR
      uses: actions/labeler@v5
      
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

## Recommended Permissions

In order to add labels to pull requests, the GitHub labeler action requires write permissions on the pull-request. However, when the action runs on a pull request from a forked repository, GitHub only grants read access tokens for `pull_request` events, at most. If you encounter an `Error: HttpError: Resource not accessible by integration`, it's likely due to these permission constraints. To resolve this issue, you can modify the `on:` section of your workflow to use
[`pull_request_target`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target) instead of `pull_request` (see example [above](#create-workflow)). This change allows the action to have write access, because `pull_request_target` alters the [context of the action](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target) and safely grants additional permissions. Refer to the [GitHub token permissions documentation](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token) for more details about access levels and event contexts.

```yml
    permissions:
      contents: read
      pull-requests: write
```

## Notes regarding `pull_request_target` event

Using the `pull_request_target` event trigger involves several peculiarities related to initial set up of the labeler or updating version of the labeler.

### Initial set up of the labeler action

When submitting an initial pull request to a repository using the `pull_request_target` event, the labeler workflow will not run on that pull request because the `pull_request_target` execution runs off the base branch instead of the pull request's branch. Unfortunately this means the introduction of the labeler can not be verified during that pull request and it needs to be committed blindly.

### Updating major version of the labeler

When submitting a pull request that includes updates of the labeler action version and associated configuration files, using the `pull_request_target` event may result in a failed workflow. This is due to the nature of `pull_request_target`, which uses the code from the base branch rather than the branch linked to the pull request — so, potentially outdated configuration files may not be compatible with the updated labeler action.

To prevent this issue, you can switch to using the `pull_request` event temporarily, before merging. This event execution draws from the code within the branch of your pull request, allowing you to verify the new configuration's compatibility with the updated labeler action.

```yml
name: "Pull Request Labeler"
on:
- pull_request
```

Once you confirm that the updated configuration files function as intended, you can then revert to using the `pull_request_target` event before merging the pull request. Following this step ensures that your workflow is robust and free from disruptions.

## Contributions

Contributions are welcome! See the [Contributor's Guide](CONTRIBUTING.md).
