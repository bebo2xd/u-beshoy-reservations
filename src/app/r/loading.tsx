import { FormSkeleton } from "@/components/ui/skeleton";

export default function TrackLookupLoading() {
  return (
    <div className="flex min-h-dvh items-center bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <FormSkeleton />
      </div>
    </div>
  );
}
