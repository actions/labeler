import { checkGlobs } from "../src/labeler";

jest.mock("@actions/core");

describe("checkGlobs", () => {
  it("returns true when our pattern does match changed files", () => {
    const changedFiles = ["foo.txt", "bar.pdf"];
    const result = checkGlobs(changedFiles, [{ any: ["*.txt"] }]);

    expect(result).toBeTruthy();
  });

  it("returns false when our pattern does not match changed files", () => {
    const changedFiles = ["foo.docx"];
    const result = checkGlobs(changedFiles, [{ any: ["*.txt"] }]);

    expect(result).toBeFalsy();
  });
});
