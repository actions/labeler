#! /usr/bin/env bash

if [[ "$(git diff --exit-code -- dist/index.js | tee /dev/tty)" ]]; then
  echo -e "‼️  Changes detected to dist/index.js! \n\tPlease run \`npm run build' and commit the result." >&2;
  exit 1;
fi

# - run: |
#     if [[ "$(git status --porcelain)" != "" ]]; then
#       echo "::set-output name=createPR::true"
#       git config --global user.email "github-actions@github.com"
#       git config --global user.name "github-actions[bot]"
#       git checkout -b bots/updateGitHubDependencies-${{github.run_number}}
#       git add .
#       git commit -m "Update Dependencies"
#       git push --set-upstream origin bots/updateGitHubDependencies-${{github.run_number}}
#     fi
