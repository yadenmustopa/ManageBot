import { type BrowserWindow, dialog, type OpenDialogOptions } from "electron";

let picking = false;

async function openFolderDialog(parent: BrowserWindow | null, options: OpenDialogOptions): Promise<string[]> {
  if (picking) return [];
  picking = true;
  const result = await (parent ? dialog.showOpenDialog(parent, options) : dialog.showOpenDialog(options)).finally(
    () => {
      picking = false;
    },
  );
  return result.canceled ? [] : result.filePaths;
}

export async function pickFolder(
  parent: BrowserWindow | null,
  options: OpenDialogOptions,
): Promise<string | undefined> {
  const paths = await openFolderDialog(parent, options);
  return paths[0];
}

export function pickFolders(parent: BrowserWindow | null, options: OpenDialogOptions): Promise<string[]> {
  return openFolderDialog(parent, options);
}
