import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import { Button } from "../ui/button";
import { Folder, Plus } from "lucide-react";

export function ClientCards() {
  return (
    <section>
      <Empty className="border hidden">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Folder />
          </EmptyMedia>
          <EmptyTitle>No Client Data Yet</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button>Add Card</Button>
        </EmptyContent>
      </Empty>
      <Card>
        <CardHeader>
            <CardTitle>
                Untitled Data
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div>

            </div>
            <div className="flex gap-1 items-center border border-dashed p-2 rounded-md opacity-40 hover:opacity-100 duration-100 hover:cursor-pointer hover:bg-primary/25 hover:border-primary hover:text-primary">
                <Plus size={12}/>
                Add Field
            </div>
        </CardContent>
      </Card>
    </section>
  );
}