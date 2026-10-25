import mdui from 'mdui/es/mdui';
import 'mdui/es/components/ripple';
import 'mdui/es/components/snackbar';

export function showSnackbar(
  message: string,
  options: Record<string, unknown> = {},
): void {
  mdui.snackbar(message, {
    timeout: 1500,
    ...options,
  });
}
