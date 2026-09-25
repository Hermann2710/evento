import { EventGridSkeleton } from "@/features/events/components/event-card";

export default function Loading() {
  return (
    <div className="container-page py-10" aria-busy="true">
      <div className="mb-6 h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
      <EventGridSkeleton />
    </div>
  );
}
