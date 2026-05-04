import { getInitials } from "./initials";

describe("getInitials", () => {
  it("returns first letter of email when no name provided", () => {
    expect(getInitials({ email: "charlie@example.com" })).toBe("C");
  });

  it("uppercases the result", () => {
    expect(getInitials({ email: "alice@x.com" })).toBe("A");
  });

  it("returns ? when nothing useful is provided", () => {
    expect(getInitials({})).toBe("?");
  });

  it("returns ? for empty email", () => {
    expect(getInitials({ email: "" })).toBe("?");
  });

  it("uses display name when provided, taking first letter", () => {
    expect(getInitials({ displayName: "Imran Khan", email: "x@y.com" })).toBe(
      "I",
    );
  });

  it("prefers display name over email", () => {
    expect(getInitials({ displayName: "Alice", email: "bob@x.com" })).toBe("A");
  });

  it("strips leading whitespace from display name", () => {
    expect(getInitials({ displayName: "  Bob" })).toBe("B");
  });
});