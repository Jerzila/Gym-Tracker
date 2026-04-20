import { SkeletonDashboard } from "@/app/components/Skeleton";

/**
 * Shown instantly when navigating between protected routes.
 * Keeps the shell (header + nav) and shows skeleton content so nothing feels blocked.
 */
export default function ProtectedLoading() {
  return <SkeletonDashboard />;
}
