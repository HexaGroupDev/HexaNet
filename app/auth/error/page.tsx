import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          Sorry, something went wrong.
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {params.error
            ? `Code error: ${params.error}`
            : "An unspecified error occurred."}
        </p>
        <Link
          href="/auth/login"
          className="text-sm underline underline-offset-4"
        >
          Back to login
        </Link>
      </CardContent>
    </Card>
  );
}
