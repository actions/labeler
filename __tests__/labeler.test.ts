import { checkGlobs } from "../src/labeler";

import * as core from "@actions/core";

jest.mock("@actions/core");

beforeAll(() => {
  jest.spyOn(core, "getInput").mockImplementation((name, options) => {
    return jest.requireActual("@actions/core").getInput(name, options);
  });
});

const matchConfig = [{ any: ["*.txt"] }];

describe("checkGlobs", () => {
  it("returns true when our pattern does match changed files", () => {
    const changedFiles = ["foo.txt", "bar.txt"];
    const result = checkGlobs(changedFiles, matchConfig, false);

    expect(result).toBeTruthy();
  });

  it("returns false when our pattern does not match changed files", () => {
    const changedFiles = ["foo.docx"];
    const result = checkGlobs(changedFiles, matchConfig, false);

    expect(result).toBeFalsy();
  });

  it("returns false for a file starting with dot if `dot` option is false", () => {
    const changedFiles = [".foo.txt"];
    const result = checkGlobs(changedFiles, matchConfig, false);

    expect(result).toBeFalsy();
  });

  it("returns false for a file starting with dot if `dot` option is true", () => {
    const changedFiles = [".foo.txt"];
    const result = checkGlobs(changedFiles, matchConfig, true);

    expect(result).toBeTruthy();
  });
});
