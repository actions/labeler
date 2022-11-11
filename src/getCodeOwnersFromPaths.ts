import Codeowners from 'codeowners'

export async function getCodeOwnersFromPaths(
  paths: string[]
): Promise<string[]> {
  const repos = new Codeowners()
  const owners: Set<string> = new Set()
  for (const path of paths) {
    const pathowners = repos.getOwner(path)
    for (const pathowner of pathowners) {
      owners.add(pathowner)
    }
  }
  return Array.from(owners);
}