import * as vscode from "vscode";
import * as fs from "fs-extra";
import * as path from "path";
import * as yaml from "yaml";
import * as cp from "child_process";

interface LocalizationConfig {
  outputFiles: string[];
  prefix: string;
  runFlutterGen: boolean;
}

export async function loadConfig(): Promise<LocalizationConfig | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspacePath = workspaceFolders!![0].uri.fsPath;
  const configPath = path.join(workspacePath, "extract_localization_config.yaml");
  if (!fs.existsSync(configPath)) {
    vscode.window.showErrorMessage(`Config file not found at ${configPath}`);
    return null;
  }

  try {
    const content = await fs.readFile(configPath, "utf8");
    return yaml.parse(content) as LocalizationConfig;
  } catch (error) {
    vscode.window.showErrorMessage("Failed to parse extract_localization_config.yaml");
    console.error(error);
    return null;
  }
}

export function keyFromSelection(text: string): string {
  return text
  .replace(/[$\{\}]/g, "") // Loại bỏ các ký tự ($, {, }) trong chuỗi.
  .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase()) // Chuyển các ký tự không phải chữ cái hoặc số thành chữ cái in hoa.
  .replace(/^./, (str) => str.toLowerCase()); // Chuyển ký tự đầu tiên thành chữ cái thường.
}

export function meaningFromSelection(text: string): string {
  return text
      .replace(/\$\{(\w+)\}/g, "{$1}")
      .replace(/\$(\w+)/g, "{$1}")
      .replace(/\$/g, "");
}

export function extractPlaceholders(text: string): string[] {
  const matches = [...text.matchAll(/\$\{(\w+)\}|\$(\w+)/g)];
  return matches.map((match) => match[1] || match[2]);
}

export async function updateLocalizationFiles(
  key: string,
  text: string,
  config: any,
  placeholders: Record<string, string>
) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspacePath = workspaceFolders!![0].uri.fsPath;
  const outputFiles = config.outputFiles;
  for (const filePath of outputFiles) {
    const fullPath = path.resolve(path.join(workspacePath, filePath));
    const fileContent = await fs.readJSON(fullPath);

    // Add key: text to the .arb file
    // (e.g., "helloWorld": "Hello, World!")
    fileContent[key] = text;

    // Add metadata for placeholders
    // (e.g., "@helloWorld": { "placeholders": { "name": { "type": "String" } } })
    if (Object.keys(placeholders).length > 0) {
      fileContent[`@${key}`] = {
        placeholders: Object.fromEntries(Object.entries(placeholders).map(([name, type]) => [name, { type }])),
      };
    }

    await fs.writeJSON(fullPath, fileContent, { spaces: 2 });
  }
}

export function runFlutterGen() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspacePath = workspaceFolders!![0].uri.fsPath;

  const process = cp.spawn("flutter", ["gen-l10n"], {
    cwd: workspacePath,
    shell: true,
  });

  process.on("close", (code) => {
    if (code !== 0) {
      vscode.window.showErrorMessage(`flutter gen-l10n failed with exit code ${code}.`);
    }
  });

  process.on("error", (err) => {
    vscode.window.showErrorMessage(`Failed to run flutter gen-l10n: ${err.message}`);
  });
}
