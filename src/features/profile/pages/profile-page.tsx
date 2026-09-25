import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { Avatar, Badge, Card, CardHeader, statusTone } from "@/components/ui/display";
import { PageHeading } from "@/components/layout/dashboard-shell";
import { ResendVerificationButton } from "@/features/auth/components/password-forms";
import { ChangePasswordForm, ProfileForm } from "../components/profile-forms";

export async function ProfilePage() {
  const user = await requireUser();
  const [t, ts, [pw]] = await Promise.all([
    getTranslations("profile"),
    getTranslations("status"),
    db.select({ hasPassword: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1),
  ]);
  const name = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeading title={t("title")} description={t("subtitle")} />
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <Avatar src={user.image} firstName={user.firstName} lastName={user.lastName} alt={name} size={72} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{name}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          {user.phoneNumber && <p className="text-sm text-gray-500">{user.phoneNumber}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="brand">{ts(`role.${user.role}`)}</Badge>
            <Badge tone={statusTone(user.status)}>{ts(`user.${user.status}`)}</Badge>
            <Badge tone={user.isEmailVerified ? "green" : "yellow"}>{user.isEmailVerified ? t("verified") : t("unverified")}</Badge>
          </div>
        </div>
        {!user.isEmailVerified && <ResendVerificationButton />}
      </Card>
      <Card>
        <CardHeader title={t("personalInfo")} description={t("personalInfoDescription")} />
        <div className="p-5">
          <ProfileForm initial={{ firstName: user.firstName, lastName: user.lastName, phoneNumber: user.phoneNumber ?? "", image: user.image ?? "" }} />
        </div>
      </Card>
      <Card>
        <CardHeader title={t("security")} description={t("securityDescription")} />
        <div className="p-5">
          <ChangePasswordForm hasPassword={Boolean(pw?.hasPassword)} />
        </div>
      </Card>
    </div>
  );
}
