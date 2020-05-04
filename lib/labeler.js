"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const minimatch_1 = require("minimatch");
function getLabels(labelGlobs, files) {
    const labels = new Set();
    for (const [label, globs] of labelGlobs.entries()) {
        core.debug(`processing ${label}`);
        for (const glob of globs) {
            core.debug(` checking pattern ${glob}`);
            const matcher = new minimatch_1.Minimatch(glob);
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
                }
                catch (_a) { }
            }
        }
    }
    return Array.from(labels);
}
exports.getLabels = getLabels;
