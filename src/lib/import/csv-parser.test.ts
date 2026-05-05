import { parseCSV } from "./csv-parser";

describe("parseCSV", () => {
  describe("basic parsing", () => {
    it("parses a simple CSV with header and one row", () => {
      const csv = "name,age\nAlice,30";
      expect(parseCSV(csv)).toEqual({
        headers: ["name", "age"],
        rows: [{ name: "Alice", age: "30" }],
      });
    });

    it("parses multiple rows", () => {
      const csv = "name,age\nAlice,30\nBob,25";
      expect(parseCSV(csv)).toEqual({
        headers: ["name", "age"],
        rows: [
          { name: "Alice", age: "30" },
          { name: "Bob", age: "25" },
        ],
      });
    });

    it("handles trailing newline", () => {
      const csv = "name,age\nAlice,30\n";
      expect(parseCSV(csv).rows).toHaveLength(1);
    });

    it("returns empty rows for header-only CSV", () => {
      expect(parseCSV("name,age").rows).toEqual([]);
    });
  });

  describe("line endings", () => {
    it("handles CRLF (Windows / Excel)", () => {
      const csv = "name,age\r\nAlice,30\r\nBob,25";
      expect(parseCSV(csv).rows).toHaveLength(2);
      expect(parseCSV(csv).rows[0].name).toBe("Alice");
    });

    it("handles mixed LF and CRLF", () => {
      const csv = "name,age\r\nAlice,30\nBob,25\r\n";
      expect(parseCSV(csv).rows).toHaveLength(2);
    });
  });

  describe("BOM (byte order mark)", () => {
    it("strips a leading BOM character", () => {
      // Excel often saves CSVs with a UTF-8 BOM (\uFEFF) at the start.
      // Without stripping, the first header would be "\uFEFFname".
      const csv = "\uFEFFname,age\nAlice,30";
      expect(parseCSV(csv).headers).toEqual(["name", "age"]);
    });
  });

  describe("whitespace", () => {
    it("trims outer whitespace on values", () => {
      const csv = "name,age\n  Alice  ,  30  ";
      expect(parseCSV(csv).rows[0]).toEqual({ name: "Alice", age: "30" });
    });

    it("trims whitespace on headers", () => {
      const csv = " name , age \nAlice,30";
      expect(parseCSV(csv).headers).toEqual(["name", "age"]);
    });

    it("preserves inner whitespace", () => {
      const csv = "name\nMonthly Groceries";
      expect(parseCSV(csv).rows[0].name).toBe("Monthly Groceries");
    });
  });

  describe("empty values", () => {
    it("represents empty cells as empty strings", () => {
      const csv = "name,unit\nFlour,";
      expect(parseCSV(csv).rows[0]).toEqual({ name: "Flour", unit: "" });
    });

    it("handles entirely empty rows by skipping them", () => {
      const csv = "name,age\nAlice,30\n\nBob,25";
      expect(parseCSV(csv).rows).toHaveLength(2);
      expect(parseCSV(csv).rows.map((r) => r.name)).toEqual(["Alice", "Bob"]);
    });
  });

  describe("quoted fields", () => {
    it("handles quoted values", () => {
      const csv = 'name,note\n"Alice","hello"';
      expect(parseCSV(csv).rows[0]).toEqual({ name: "Alice", note: "hello" });
    });

    it("preserves commas inside quoted fields", () => {
      const csv = 'name,note\nAlice,"Hello, world"';
      expect(parseCSV(csv).rows[0].note).toBe("Hello, world");
    });

    it("handles escaped quotes inside quoted fields (RFC 4180)", () => {
      // "" inside a quoted field is an escaped " character
      const csv = 'name,note\nAlice,"She said ""hi"""';
      expect(parseCSV(csv).rows[0].note).toBe('She said "hi"');
    });

    it("handles quoted fields containing newlines", () => {
      const csv = 'name,note\nAlice,"line one\nline two"\nBob,short';
      expect(parseCSV(csv).rows).toHaveLength(2);
      expect(parseCSV(csv).rows[0].note).toBe("line one\nline two");
    });
  });

  describe("error cases", () => {
    it("throws when row has fewer columns than header", () => {
      const csv = "name,age\nAlice"; // missing age column
      expect(() => parseCSV(csv)).toThrow(/column count/i);
    });

    it("throws when row has more columns than header", () => {
      const csv = "name,age\nAlice,30,extra";
      expect(() => parseCSV(csv)).toThrow(/column count/i);
    });

    it("throws on empty input", () => {
      expect(() => parseCSV("")).toThrow(/empty/i);
    });

    it("throws on whitespace-only input", () => {
      expect(() => parseCSV("   \n  \n")).toThrow(/empty/i);
    });
  });
});