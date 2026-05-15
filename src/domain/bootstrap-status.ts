export const bootstrapStatus = {
  convex: "Convex client configured",
  items: [
    {
      label: "Frontend",
      value: "Next.js App Router with TypeScript, Tailwind, and ESLint.",
    },
    {
      label: "Backend",
      value: "Convex package installed with local setup documented.",
    },
    {
      label: "Workflow",
      value: "Scripts, docs, templates, and test runner are ready for PR slices.",
    },
  ],
} as const;
