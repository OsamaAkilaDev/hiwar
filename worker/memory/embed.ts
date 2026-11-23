export const EMBEDDING_MODEL = "@cf/baai/bge-m3";

export async function embed(env: Env, texts: string[]): Promise<number[][]> {
  const output = await env.AI.run(EMBEDDING_MODEL, { text: texts });
  if (!("data" in output) || !output.data) {
    throw new Error("Embedding response had no data");
  }
  return output.data;
}
