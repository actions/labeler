import { checkGlobs } from "../src/labeler";

import * as core from "@actions/core";

jest.mock("@actions/core");

beforeAll(() => {
  jest.spyOn(core, "getInput").mockImplementation((name, options) => {
    return jest.requireActual("@actions/core").getInput(name, options);
  });
});

const matchConfig = [{ any: ["*.txt"], status: ["added", "modified"] }];

describe("checkGlobs", () => {
  it("returns true when our pattern does match changed files & status", () => {
    const changedFiles = [
      { filename: "foo.txt", status: "modified" },
      { filename: "bar.txt", status: "modified" },
    ];
    const result = checkGlobs(changedFiles, matchConfig);

    expect(result).toBeTruthy();
  });

  it("returns false when our pattern does not match changed files", () => {
    const changedFiles = [{ filename: "foo.docx", status: "modified" }];
    const result = checkGlobs(changedFiles, matchConfig);

    expect(result).toBeFalsy();
  });

  it("returns false when our pattern does not match changed files status", () => {
    const changedFiles = [{ filename: "foo.docx", status: "removed" }];
    const result = checkGlobs(changedFiles, matchConfig);

    expect(result).toBeFalsy();
  });
});
