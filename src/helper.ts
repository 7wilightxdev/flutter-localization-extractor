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

    // Đọc file dưới dạng text, 
    // Dùng cách này để không thay đổi content cũ, không remove duplicate keys
    let fileText = await fs.readFile(fullPath, 'utf-8');

    // Tìm vị trí của dấu } cuối cùng
    const lastBraceIndex = fileText.lastIndexOf('}');

    if (lastBraceIndex === -1) {
      console.error('Invalid JSON file format');
      continue;
    }

    // Tìm vị trí của dấu phẩy hoặc newline trước dấu } cuối
    let insertPosition = lastBraceIndex;
    let beforeBrace = fileText.substring(0, lastBraceIndex).trimEnd();

    // Kiểm tra xem có cần thêm dấu phẩy không
    const needsComma = beforeBrace.length > 0 &&
      beforeBrace[beforeBrace.length - 1] !== ',' &&
      beforeBrace[beforeBrace.length - 1] !== '{';

    // Lấy indent từ file (thường là 2 spaces)
    const indentMatch = fileText.match(/\n( +)"/);
    const indent = indentMatch ? indentMatch[1] : '  ';

    // Tạo nội dung mới cần thêm
    let newContent = '';

    if (needsComma) {
      newContent += ',';
    }

    newContent += `\n${indent}"${key}": "${text}"`;

    // Thêm metadata cho placeholders nếu có
    if (Object.keys(placeholders).length > 0) {
      const placeholdersObj = Object.fromEntries(
        Object.entries(placeholders).map(([name, type]) => [name, { type }])
      );
      const placeholdersStr = JSON.stringify(placeholdersObj, null, indent.length)
        .split('\n')
        .map((line, i) => i === 0 ? line : indent + line)
        .join('\n');

      newContent += `,\n${indent}"@${key}": ${placeholdersStr}`;
    }

    // Chèn nội dung mới vào trước dấu }
    const updatedText = fileText.substring(0, insertPosition) +
      newContent +
      '\n' +
      fileText.substring(insertPosition);

    // Ghi lại file
    await fs.writeFile(fullPath, updatedText, 'utf-8');
  }
}

export function runGenCommand(commandString: string) {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder found.");
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  const { command, args } = parseCommand(commandString);
  const process = cp.spawn(command, args, {
    cwd: workspacePath,
    shell: true,
  });

  process.stdout.on("data", (data) => {
    vscode.window.showErrorMessage(
      `Command "${command} ${args}" completed successfully.`
    );
  });

  process.on("close", (code) => {
    if (code !== 0) {
      vscode.window.showErrorMessage(
        `Command "${command} ${args}" failed with exit code ${code}.`
      );
    } else {
      vscode.window.showInformationMessage(
        `Command "${command} ${args}" completed successfully.`
      );
    }
  });

  process.on("error", (err) => {
    vscode.window.showErrorMessage(
      `Failed to run "${command} ${args}": ${err.message}`
    );
  });
}