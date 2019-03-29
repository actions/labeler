# Pull Request Labeller

This action labels pull requests by comparing their changed files to a configuration file in the repository.

For example, a configuration file at `.github/triage.yml` may look like this:

```yaml
design:
  - src/frontend/**/*.css
  - src/frontend/**/*.png

server:
  - src/server/**/*
```

And the action would be used like this:

```workflow
workflow "Apply PR labels" {
  on = "pull_request"
  resolves = "Apply labels"
}

action "On sync" {
  uses = "actions/bin/filter@master"
  args = "action synchronize"
}

action "Apply labels" {
  uses = "actions/labeller@v1.0.0"
  needs = "On sync"
  env = {LABEL_SPEC_FILE=".github/triage.yml"}
  secrets = ["GITHUB_TOKEN"]
}
```

Now, whenever a user pushes to a pull request, this action will determine whether any changed files in that pull request match the specification file (note: this action uses [minimatch](https://github.com/isaacs/minimatch) to determine matches). If there are matches, the action will apply the appropriate labels to the pull request.

## Contributing

Check out [this doc](CONTRIBUTING.md).

## License

This action is released under the [MIT license](LICENSE.md).
Container images built with this project include third party materials. See [THIRD_PARTY_NOTICE.md](THIRD_PARTY_NOTICE.md) for details.

## Current Status

This action is in active development.
