import * as vscode from "vscode";
import {
  loadConfig,
  updateLocalizationFiles,
  keyFromSelection,
  meaningFromSelection,
  extractPlaceholders,
  runGenCommand,
  parseCommand,
} from "./helper";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("extension.extractLocalizationKey", async () => {
    // Get the active text editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor found.");
      return;
    }

    // Load the configuration file
    const config = await loadConfig();
    if (!config) {
      vscode.window.showErrorMessage("Failed to load extract_localization_config.yaml.");
      return;
    }

    // Get the selected text and clean it
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection).trim().replace(/^["']|["']$/g, "");

    // Create a default key from the cleaned text using camel case and remove special characters
    // (e.g., "Hello, World!" => helloWorld)
    const defaultKey = keyFromSelection(selectedText);

    // Prompt the user to enter a localization key
    const key = await vscode.window.showInputBox({
      prompt: "Enter localization key",
      value: defaultKey,
    });

    // Check if the key is valid and doesn't contain special characters
    if (!key || !/^[a-zA-Z0-9]+$/.test(key)) {
      vscode.window.showErrorMessage("Localization key is invalid");
      return;
    }

    // Replace `${}` in the text with `{}` for meaning
    // (e.g., "Hello, ${name}!" => "Hello, {name}!")
    // (e.g., "Hello, $name!" => "Hello, {name}!")
    const defaultText = meaningFromSelection(selectedText);

    // analyze the placeholders from String Interpolation
    // (e.g., "Hello, ${name}!" => ["name"])
    const placeholders = extractPlaceholders(selectedText);

    // Prompt the user to enter data types for the placeholders
    const placeholderTypes: Record<string, string> = {};
    for (const placeholder of placeholders) {
      const placeholderType = await vscode.window.showInputBox({
        prompt: `Enter data type for placeholder '${placeholder}' (e.g., String, int)`,
        value: "String",
      });
      if (!placeholderType) {
        vscode.window.showErrorMessage(`Data type for placeholder '${placeholder}' is required.`);
        return;
      }
      placeholderTypes[placeholder] = placeholderType;
    }

    // Update the localization files
    await updateLocalizationFiles(key, defaultText, config, placeholderTypes);

    // Replace the selected text with the localization key
    editor.edit((editBuilder) => {
      var replacedText = `${config.prefix}.${key}`;
      if (placeholders.length > 0) {
        const placeholderList = placeholders.join(", ");
        replacedText += `(${placeholderList})`;
      }
      editBuilder.replace(selection, replacedText);
    });

    // Show a success message
    vscode.window.showInformationMessage(`Localization key '${key}' created successfully.`);

    // Run flutter gen-l10n
    if (config.genCommand) {
      runGenCommand(config.genCommand);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() { }
