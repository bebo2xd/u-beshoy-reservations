import { LoginSkeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <LoginSkeleton />
    </div>
  );
}
