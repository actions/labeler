import * as core from "@actions/core";
import { Minimatch } from "minimatch";

export function getLabels(
  labelGlobs: Map<string, string[]>,
  files: string[]
): string[] {
  const labels = new Set<string>();

  for (const [label, globs] of labelGlobs.entries()) {
    core.debug(`processing ${label}`);
    for (const glob of globs) {
      core.debug(` checking pattern ${glob}`);
      const matcher = new Minimatch(glob);
      for (const file of files) {
        core.debug(` - ${file}`);
        if (matcher.match(file)) {
          core.debug(` ${file} matches glob ${glob}`);
          labels.add(label);
          continue;
        }
        try {
          const regex = new RegExp(glob);
          if (file.match(regex)) {
            core.debug(` ${file} matches regex ${regex}`);
            labels.add(file.replace(regex, label));
          }
        } catch {}
      }
    }
  }

  return Array.from(labels);
}
