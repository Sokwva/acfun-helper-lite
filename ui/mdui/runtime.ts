import mdui from 'mdui/es/mdui';
import 'mdui/es/global/mutation';
import 'mdui/es/components/drawer';
import 'mdui/es/components/dialog/confirm';
import 'mdui/es/components/snackbar';
import 'mdui/es/components/textfield';
import 'mdui/es/components/ripple';

export interface MduiDrawerInstance {
  open(): void;
  close(): void;
  toggle(): void;
  getState(): string;
}

export function createDrawer(element: HTMLElement): MduiDrawerInstance {
  return new mdui.Drawer(element, {
    overlay: false,
  }) as MduiDrawerInstance;
}

export function refreshMdui(): void {
  mdui.mutation();
  mdui.updateTextFields?.();
}

export function showSnackbar(
  message: string,
  options: Record<string, unknown> = {},
): void {
  mdui.snackbar(message, {
    timeout: 1800,
    ...options,
  });
}

export function confirmAction(
  message: string,
  title = '确认',
): Promise<boolean> {
  return new Promise((resolve) => {
    mdui.confirm(
      message,
      title,
      () => resolve(true),
      () => resolve(false),
      {
        history: false,
        modal: true,
        closeOnEsc: false,
        confirmText: '确定',
        cancelText: '取消',
      },
    );
  });
}
