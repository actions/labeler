import * as labeler from "../src/labeler";

describe("Labeler", () => {
  it("should parse globs and create labels", async () => {
    const labelGlobs = new Map([
      ["core", ["core/*.js", "core/**/*.js"]],
      ["resource/$1", ["package\\/resource_(\\w*?)(_test)?.go"]]
    ]);

    const files = [
      "package/resource_foo.go",
      "package/resource_foo_test.go",
      "core/foo.js",
      "core/foo/foo.js"
    ];

    const labels = labeler.getLabels(labelGlobs, files);

    expect(labels).toHaveLength(2);
    expect(labels).toContain("resource/foo");
    expect(labels).toContain("core");
  });
});
