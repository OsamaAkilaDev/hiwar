import { expect, test } from "bun:test";
import { ar } from "../i18n/ar";
import { en } from "../i18n/en";
import { withoutName as strip } from "./greeting";

test("every greeting reads cleanly without a name", () => {
  for (const dict of [en, ar]) {
    for (const [key, value] of Object.entries(dict)) {
      if (!key.startsWith("greetings.")) continue;
      for (const line of value.split("|")) {
        const bare = strip(line);
        expect(bare).not.toContain("{name}");
        expect(bare).not.toMatch(/^[\s,،]|\s[?؟]|،\s*$/);
      }
    }
  }
});
