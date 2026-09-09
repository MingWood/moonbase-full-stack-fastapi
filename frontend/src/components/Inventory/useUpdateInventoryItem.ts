import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type InventoryItemUpdate, InventoryService } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InventoryItemUpdate }) =>
      InventoryService.updateInventoryItem({ path: { id }, body: data }),
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
  })
}
