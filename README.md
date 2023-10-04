# Pull Request Labeler

[![Basic validation](https://github.com/actions/labeler/actions/workflows/basic-validation.yml/badge.svg?branch=main)](https://github.com/actions/labeler/actions/workflows/basic-validation.yml)

Automatically label new pull requests based on the paths of files being changed.

## Usage

### Create `.github/labeler.yml`

Create a `.github/labeler.yml` file with a list of labels and [minimatch](https://github.com/isaacs/minimatch) globs to match to apply the label.

The key is the name of the label in your repository that you want to add (e.g. `merge conflict`, `needs-updating`) and the value is the path (glob) of the changed files (e.g. `src/**`, `tests/*.spec.js`) or a match object.

#### Match Object

For more control over matching, you can provide a match object instead of a simple path glob. The match object is defined as:

```yml
- any: ['list', 'of', 'globs']
  all: ['list', 'of', 'globs']
```

One or both fields can be provided for fine-grained matching. Unlike the top-level list, the list of path globs provided to `any` and `all` must ALL match against a path for the label to be applied.

The fields are defined as follows:
* `any`: match ALL globs against ANY changed path
* `all`: match ALL globs against ALL changed paths

A simple path glob is the equivalent to `any: ['glob']`. More specifically, the following two configurations are equivalent:
```yml
label1:
- example1/*
```
and
```yml
label1:
- any: ['example1/*']
```

From a boolean logic perspective, top-level match objects are `OR`-ed together and individual match rules within an object are `AND`-ed. Combined with `!` negation, you can write complex matching rules.

> ⚠️ This action uses [minimatch](https://www.npmjs.com/package/minimatch) to apply glob patterns.
> For historical reasons, paths starting with dot (e.g. `.github`) are not matched by default.
> You need to set `dot: true` to change this behavior.
> See [Inputs](#inputs) table below for details.

#### Advanced configuration

In order to define label colors, the `.github/labeler.yml` can be extended as follow:
```yml
# Add 'label1' to any changes within 'example' folder or any subfolders
label1:
  pattern:
    - example/**
  color:
    '#FFFF00'


# Add 'label2' to any file changes within 'example2' folder
label2: example2/*

# Add label3 to any change to .txt files within the entire repository. Quotation marks are required for the leading asterisk
label3:
  pattern:
    - '**/*.txt'
  color:
    '#ECECEC'

```


#### Basic Examples

```yml
# Add 'label1' to any changes within 'example' folder or any subfolders
label1:
- example/**

# Add 'label2' to any file changes within 'example2' folder
label2: example2/*

# Add label3 to any change to .txt files within the entire repository. Quotation marks are required for the leading asterisk
label3:
- '**/*.txt'

```

#### Common Examples

```yml
# Add 'repo' label to any root file changes
repo:
- '*'

# Add '@domain/core' label to any change within the 'core' package
'@domain/core':
- package/core/**

# Add 'test' label to any change to *.spec.js files within the source dir
test:
- src/**/*.spec.js

# Add 'source' label to any change to src files within the source dir EXCEPT for the docs sub-folder
source:
- any: ['src/**', '!src/docs/*']

# Add 'frontend` label to any change to *.js files as long as the `main.js` hasn't changed
frontend:
- any: ['src/**/*.js']
  all: ['!src/main.js']

# Add the 'AnyChange' label to any changes within the entire repository if the 'dot' option is set to 'false'
AnyChange:
- '**'
- '**/.*'
- '**/.*/**'
- '**/.*/**/.*'

# Add the 'AnyChange' label to any changes within the entire repository if the 'dot' option is set to 'true'
AnyChange:
- '**'
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
    - uses: actions/labeler@v4
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
    - uses: actions/checkout@v3 # Uploads repository content to the runner
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

In order to add labels to pull requests, the GitHub labeler action requires
write permissions on the pull-request. However, when the action runs on a pull
request from a forked repository, GitHub only grants read access tokens for
`pull_request` events, at most. If you encounter an `Error: HttpError: Resource
not accessible by integration`, it's likely due to these permission constraints.
To resolve this issue, you can modify the `on:` section of your workflow to use
[`pull_request_target`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target)
instead of `pull_request` (see example [above](#create-workflow)). This change
allows the action to have write access, because `pull_request_target` alters the
[context of the
action](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target)
and safely grants additional permissions. Refer to the [GitHub token
permissions
documentation](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
for more details about access levels and event contexts.

## Contributions

Contributions are welcome! See the [Contributor's Guide](CONTRIBUTING.md).
