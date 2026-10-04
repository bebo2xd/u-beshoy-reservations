import { BookingSkeleton } from "@/components/booking/BookingSkeleton";
import { MemberShellSkeleton } from "@/components/shell/MemberShellSkeleton";

export default function BookLoading() {
  return (
    <MemberShellSkeleton>
      <BookingSkeleton />
    </MemberShellSkeleton>
  );
}
