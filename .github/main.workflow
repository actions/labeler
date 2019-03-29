workflow "Lint JavaScript" {
  on = "push"
  resolves = ["Lint", "Formatting"]
}

action "Lint" {
  uses = "actions/npm@v2.0.0"
  runs = "npx eslint --no-eslintrc --env es6 --parser-options ecmaVersion:2018 entrypoint.js"
}

action "Formatting" {
  uses = "actions/npm@v2.0.0"
  runs = "npx prettier -c --no-semi --no-bracket-spacing --single-quote entrypoint.js"
}