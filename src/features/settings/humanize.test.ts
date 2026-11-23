import { expect, test } from "bun:test";
import { humanizeKey } from "./humanize";

test("fact keys read as sentences", () => {
  expect(humanizeKey("preferred_language")).toBe("Preferred language");
  expect(humanizeKey("name")).toBe("Name");
  expect(humanizeKey("ongoing_projects")).toBe("Ongoing projects");
});
