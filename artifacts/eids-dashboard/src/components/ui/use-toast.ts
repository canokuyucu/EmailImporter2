import * as React from "react"

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive"
}

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastListeners = new Set<(toasts: ToasterToast[]) => void>()
let memoryState: ToasterToast[] = []

function dispatch(action: any) {
  if (action.type === "ADD_TOAST") {
    memoryState = [action.toast, ...memoryState].slice(0, TOAST_LIMIT)
  } else if (action.type === "DISMISS_TOAST") {
    memoryState = memoryState.filter((t) => t.id !== action.toastId)
  }
  toastListeners.forEach((listener) => listener(memoryState))
}

export function toast(props: Omit<ToasterToast, "id">) {
  const id = genId()
  const update = (props: ToasterToast) => dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss()
      },
    },
  })

  setTimeout(() => {
    dismiss()
  }, 3000)

  return { id, dismiss, update }
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToasterToast[]>(memoryState)

  React.useEffect(() => {
    toastListeners.add(setToasts)
    return () => {
      toastListeners.delete(setToasts)
    }
  }, [])

  return {
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
    toasts,
  }
}
