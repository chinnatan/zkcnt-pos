export interface DialogOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
  defaultValue?: string;
  inputPlaceholder?: string;
}

type DialogType = "alert" | "confirm" | "prompt";

const state = reactive({
  visible: false,
  type: "alert" as DialogType,
  message: "",
  title: "",
  confirmText: "",
  cancelText: "",
  variant: "default" as "default" | "danger",
  inputValue: "",
  inputPlaceholder: "",
});

let resolver: ((value: unknown) => void) | null = null;

function openDialog(type: DialogType, message: string, options?: DialogOptions) {
  state.type = type;
  state.message = message;
  state.title = options?.title ?? "";
  state.confirmText = options?.confirmText ?? "";
  state.cancelText = options?.cancelText ?? "";
  state.variant = options?.variant ?? (type === "confirm" ? "danger" : "default");
  state.inputValue = options?.defaultValue ?? "";
  state.inputPlaceholder = options?.inputPlaceholder ?? "";
  state.visible = true;
}

function closeDialog(result: unknown) {
  state.visible = false;
  resolver?.(result);
  resolver = null;
}

export function useDialog() {
  function alert(message: string, options?: DialogOptions): Promise<void> {
    return new Promise((resolve) => {
      resolver = () => resolve();
      openDialog("alert", message, options);
    });
  }

  function confirm(message: string, options?: DialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      resolver = (result) => resolve(result === true);
      openDialog("confirm", message, options);
    });
  }

  function prompt(message: string, options?: DialogOptions): Promise<string | null> {
    return new Promise((resolve) => {
      resolver = (result) => resolve(typeof result === "string" ? result : null);
      openDialog("prompt", message, options);
    });
  }

  function onConfirm() {
    if (state.type === "prompt") {
      closeDialog(state.inputValue);
      return;
    }
    if (state.type === "confirm") {
      closeDialog(true);
      return;
    }
    closeDialog(undefined);
  }

  function onCancel() {
    if (state.type === "confirm") {
      closeDialog(false);
      return;
    }
    if (state.type === "prompt") {
      closeDialog(null);
      return;
    }
    closeDialog(undefined);
  }

  function setInputValue(value: string) {
    state.inputValue = value;
  }

  return {
    state,
    alert,
    confirm,
    prompt,
    onConfirm,
    onCancel,
    setInputValue,
  };
}
