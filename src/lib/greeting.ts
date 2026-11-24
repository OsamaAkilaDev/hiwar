export type Bucket = "morning" | "afternoon" | "evening" | "night";

export const bucketOf = (hour: number): Bucket =>
  hour < 5 || hour >= 22
    ? "night"
    : hour < 12
      ? "morning"
      : hour < 17
        ? "afternoon"
        : "evening";

// Variants are written once with {name}; without a name the vocative part
// (", {name}" or "يا {name}") drops out and the sentence still reads whole.
export const withoutName = (line: string) =>
  line.replace(/[,،]?\s*(يا\s+)?\{name\}/, "");
