import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const PendingInventory = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Location</TableHead>
        <TableHead>Address</TableHead>
        <TableHead>Category</TableHead>
        <TableHead>Unit</TableHead>
        <TableHead>Qty</TableHead>
        <TableHead>Reorder At</TableHead>
        <TableHead>Supplier</TableHead>
        <TableHead>Notes</TableHead>
        <TableHead>Last Updated</TableHead>
        <TableHead>
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          {Array.from({ length: 11 }).map((_, cellIndex) => (
            <TableCell key={cellIndex}>
              <Skeleton className="h-4 w-24" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
)

export default PendingInventory
