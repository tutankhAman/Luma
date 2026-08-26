import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { verifiedLoansApi } from "@/lib/api";

export default function ExportPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="mb-2 font-semibold text-[28px] text-white tracking-tight">
        Export
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Download verified dataset</CardTitle>
          <CardDescription>
            CSV includes all canonical fields plus verification timestamp, hash
            and result. The export event is audit logged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            render={
              <a
                href={verifiedLoansApi.exportCsv()}
                rel="noopener"
                target="_blank"
              />
            }
            variant="outline"
          >
            <i aria-hidden="true" className="ri-download-2-line mr-2" />
            Export verified loans (CSV)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
