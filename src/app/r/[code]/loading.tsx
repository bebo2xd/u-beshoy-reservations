import { CardListSkeleton } from "@/components/ui/skeleton";

export default function TrackCodeLoading() {
  return (
    <div className="min-h-dvh bg-background px-5 py-8">
      <div className="mx-auto max-w-md">
        <CardListSkeleton count={1} />
      </div>
    </div>
  );
}
