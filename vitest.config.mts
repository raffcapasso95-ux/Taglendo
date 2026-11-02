import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./", import.meta.url)) };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        // richiede `npm run db:start`
        test: {
          name: "db",
          include: ["supabase/tests/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
        },
      },
    ],
  },
});
