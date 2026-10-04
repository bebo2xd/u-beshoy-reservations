import { AdminNav } from "@/components/admin/AdminNav";
import { getProfile, getUserPermissions } from "@/lib/auth/session";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [permissions, profile] = await Promise.all([
    getUserPermissions(),
    getProfile(),
  ]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-sand-1 lg:flex-row">
      <AdminNav
        permissions={Array.from(permissions)}
        user={
          profile
            ? {
                full_name: profile.full_name,
                email: profile.email,
                role: profile.role,
              }
            : null
        }
      />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
