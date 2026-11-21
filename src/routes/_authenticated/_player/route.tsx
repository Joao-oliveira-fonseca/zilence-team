import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { memberQueryOptions } from "@/lib/member";

export const Route = createFileRoute("/_authenticated/_player")({
  beforeLoad: async ({ context }) => {
    const member = await context.queryClient.ensureQueryData(memberQueryOptions);
    if (member?.role !== "player") throw redirect({ to: "/home" });
  },
  component: () => <Outlet />,
});
