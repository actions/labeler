const {Toolkit} = require('actions-toolkit')
const fs = require('fs')
const minimatch = require('minimatch')
const yaml = require('js-yaml')

const tools = new Toolkit()

main().catch(err => {
  tools.log.fatal(err)
  tools.exit.failure()
})

async function main() {
  const specFile = readSpecFile()
  const changedFiles = await getChangedFiles()

  for (const label in specFile) {
    let globs

    if (typeof specFile[label] === 'string') {
      globs = [specFile[label]]
    } else if (Array.isArray(specFile[label])) {
      globs = specFile[label]
    } else {
      throw new Error('Spec file values must be strings or arrays of strings')
    }

    for (const glob of globs) {
      for (const changedFile of changedFiles) {
        if (minimatch(changedFile, glob)) {
          await tools.github.issues.addLabels(
            tools.context.issue({labels: [label]})
          )
        }
      }
    }
  }
}

async function getChangedFiles(changedFiles = [], cursor = null) {
  const [nextCursor, paths] = await queryChangedFiles(cursor)

  if (paths.length < 100) {
    return changedFiles.concat(paths)
  }

  return getChangedFiles(changedFiles.concat(paths), nextCursor)
}

async function queryChangedFiles(cursor) {
  const result = await tools.github.graphql(
    `
    query($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          files(first: 100, after: $cursor) {
            edges {
              cursor
            }

            nodes {
              path
            }
          }
        }
      }
    }
  `,
    tools.context.issue({cursor})
  )

  const nextCursor = result.repository.pullRequest.files.edges.cursor
  const paths = result.repository.pullRequest.files.nodes.map(node => node.path)
  return [nextCursor, paths]
}

function readSpecFile() {
  const specFilePath = process.env.LABEL_SPEC_FILE

  let specFile

  try {
    specFile = yaml.safeLoad(fs.readFileSync(specFilePath))
  } catch (err) {
    if (err.code === 'ERR_INVALID_ARG_TYPE') {
      tools.log.error('You must provide a LABEL_SPEC_FILE environment variable')
    }

    if (err.code === 'ENOENT') {
      tools.log.error(
        `Expected a configuration file at "${specFilePath}", but no file was found`
      )
    }

    if (err.name === 'YAMLException') {
      tools.log.error('Configuration file is not valid YAML')
    }

    throw err
  }

  return specFile
}
