import { checkGlobs } from "../src/main";

describe('labeler', () => {
  describe('checkGlobs', () => {
    it("should return true because match **/* to any files", () => {
      const isMatched = checkGlobs([
        '/test/file.js',
        '/test/readme.md'
      ], [
        '**/*'
      ]);
      expect(isMatched).toBeTruthy();
    });
    it("should return true because match `example/**/*` to `example/` or any sub-folders", () => {
      const isMatched1 = checkGlobs([
          '/test/example/file.js',
      ], [
          '**/example/**/*'
      ]);
      expect(isMatched1).toBeTruthy();

      const isMatched2 = checkGlobs([
        '/test/example/nest/file.js',
      ], [
        '**/example/**/*'
      ]);
      expect(isMatched2).toBeTruthy();
    });
    it("should return true because match **/*.js to js files", () => {
      const isMatched = checkGlobs([
        '/test/file.js'
      ], [
        '**/*.js'
      ]);
      expect(isMatched).toBeTruthy();
    });
    it("should return false because **/*.test does not match any files", () => {
      const isMatched = checkGlobs([
        '/test/file.js',
        '/test/readme.md'
      ], [
        '**/*.test'
      ]);
      expect(isMatched).toBeFalsy();
    });
    it("should return false because ./**/* does not match any files", () => {
      const isMatched = checkGlobs([
        '/test/file.js',
        '/test/readme.md'
      ], [
        './**/*'
      ]);
      expect(isMatched).toBeFalsy();
    });
  });
});
