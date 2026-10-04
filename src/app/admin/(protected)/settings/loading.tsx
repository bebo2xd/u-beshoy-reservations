import { FormSkeleton, ScreenHeaderSkeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <ScreenHeaderSkeleton />
      <FormSkeleton />
    </div>
  );
}
