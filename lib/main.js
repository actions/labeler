"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const yaml = __importStar(require("js-yaml"));
const minimatch_1 = require("minimatch");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput('repo-token', { required: true });
            const configPath = core.getInput('configuration-path', { required: true });
            const prNumber = getPrNumber();
            if (!prNumber) {
                console.log('Could not get pull request number from context, exiting');
                return;
            }
            const client = new github.GitHub(token);
            core.debug(`fetching changed files for pr #${prNumber}`);
            const changedFiles = yield getChangedFiles(client, prNumber);
            const labelGlobs = yield getLabelGlobs(client, configPath);
            const labels = [];
            for (const [label, globs] of labelGlobs.entries()) {
                core.debug(`processing ${label}`);
                if (checkGlobs(changedFiles, globs)) {
                    labels.push(label);
                }
            }
            if (labels.length > 0) {
                yield addLabels(client, prNumber, labels);
            }
        }
        catch (error) {
            core.error(error);
            core.setFailed(error.message);
        }
    });
}
function getPrNumber() {
    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) {
        return undefined;
    }
    return pullRequest.number;
}
function getChangedFiles(client, prNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        const listFilesResponse = yield client.pulls.listFiles({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: prNumber
        });
        const changedFiles = listFilesResponse.data.map(f => f.filename);
        core.debug('found changed files:');
        for (const file of changedFiles) {
            core.debug('  ' + file);
        }
        return changedFiles;
    });
}
function getLabelGlobs(client, configurationPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const configurationContent = yield fetchContent(client, configurationPath);
        // loads (hopefully) a `{[label:string]: string | string[]}`, but is `any`:
        const configObject = yaml.safeLoad(configurationContent);
        // transform `any` => `Map<string,string[]>` or throw if yaml is malformed:
        return getLabelGlobMapFromObject(configObject);
    });
}
function fetchContent(client, repoPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield client.repos.getContents({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            path: repoPath,
            ref: github.context.sha
        });
        if (!('content' in response.data)) {
            throw new Error(`The path '${repoPath}' is not a file`);
        }
        if (!response.data.content) {
            throw new Error(`The file '${repoPath}' has no content`);
        }
        return Buffer.from(response.data.content, 'base64').toString();
    });
}
function getLabelGlobMapFromObject(configObject) {
    const labelGlobs = new Map();
    for (const label in configObject) {
        if (typeof configObject[label] === 'string') {
            labelGlobs.set(label, [configObject[label]]);
        }
        else if (configObject[label] instanceof Array) {
            labelGlobs.set(label, configObject[label]);
        }
        else {
            throw Error(`found unexpected type for label ${label} (should be string or array of globs)`);
        }
    }
    return labelGlobs;
}
function checkGlobs(changedFiles, globs) {
    for (const glob of globs) {
        core.debug(` checking pattern ${glob}`);
        const matcher = new minimatch_1.Minimatch(glob);
        for (const changedFile of changedFiles) {
            core.debug(` - ${changedFile}`);
            if (matcher.match(changedFile)) {
                core.debug(` ${changedFile} matches`);
                return true;
            }
        }
    }
    return false;
}
function addLabels(client, prNumber, labels) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.issues.addLabels({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: prNumber,
            labels: labels
        });
    });
}
run();
