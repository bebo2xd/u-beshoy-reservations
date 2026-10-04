import { MemberShellSkeleton } from "@/components/shell/MemberShellSkeleton";
import { CardListSkeleton } from "@/components/ui/skeleton";

export default function MyBookingsLoading() {
  return (
    <MemberShellSkeleton>
      <div className="mx-auto max-w-2xl">
        <CardListSkeleton />
      </div>
    </MemberShellSkeleton>
  );
}
