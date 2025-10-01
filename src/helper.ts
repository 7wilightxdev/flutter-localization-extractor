import * as vscode from "vscode";
import * as fs from "fs-extra";
import * as path from "path";
import * as yaml from "yaml";
import * as cp from "child_process";

interface LocalizationConfig {
  outputFiles: string[];
  prefix: string;
  genCommand: string;
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


export function parseCommand(commandString: string): { command: string; args: string[] } {
  const parts = commandString.trim().split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);
  return { command, args };
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

    // Đọc file dưới dạng text để không tự sắp xếp keys
    const fileText = await fs.readFile(fullPath, 'utf-8');
    const fileContent = JSON.parse(fileText);

    // Thêm key mới
    fileContent[key] = text;

    // Thêm metadata cho placeholders
    if (Object.keys(placeholders).length > 0) {
      fileContent[`@${key}`] = {
        placeholders: Object.fromEntries(
          Object.entries(placeholders).map(([name, type]) => [name, { type }])
        ),
      };
    }

    // Chuyển đổi thành JSON string với format đẹp
    const jsonString = JSON.stringify(fileContent, null, 2);

    // Ghi lại file
    await fs.writeFile(fullPath, jsonString + '\n', 'utf-8');
  }
}

export function runGenCommand(command: string = "flutter", args: string[] = ["gen-l10n"]) {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder found.");
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;

  const process = cp.spawn(command, args, {
    cwd: workspacePath,
    shell: true,
  });

  process.on("close", (code) => {
    if (code !== 0) {
      vscode.window.showErrorMessage(
        `Command "${command} ${args.join(' ')}" failed with exit code ${code}.`
      );
    } else {
      vscode.window.showInformationMessage(
        `Command "${command} ${args.join(' ')}" completed successfully.`
      );
    }
  });

  process.on("error", (err) => {
    vscode.window.showErrorMessage(
      `Failed to run "${command} ${args.join(' ')}": ${err.message}`
    );
  });
}