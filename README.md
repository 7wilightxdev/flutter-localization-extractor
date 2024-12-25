# Localization Key Extractor for Flutter

This Visual Studio Code extension simplifies the process of extracting and managing localization keys for Flutter applications. It allows developers to easily convert text into localized keys and manage ARB files (`app_en.arb`, `app_vi.arb`, etc.) directly from the editor.

## ✨ Features

- **Extract Localization Keys:** Quickly create localization keys from selected text.
- **Automatic ARB File Updates:** Add generated keys and translations directly to your ARB files.
- **Support for String Interpolation:** Handles placeholders like `$username` or `${username}` automatically.
- **Run `flutter gen-l10n` (Optional):** Automatically regenerate localization files after updates.
- **Customizable Configurations:** Define output files and prefixes via `extract_localization_config.yaml`.

## 🚀 Installation

1. Install the extension from the Visual Studio Code Marketplace.
2. Add a `extract_localization_config.yaml` file to your project workspace (details in the **Configuration** section).

## ⚙️ Configuration

Add a `extract_localization_config.yaml` file to the root of your project with the following structure:

```yaml
output_files:
  - lib/i10n/app_en.arb
  - lib/i10n/app_vi.arb
prefix: AppLocalization.of(context)
run_flutter_gen: true
```

### Configuration Fields

1. `output_files`: A list of paths to your ARB files.
2. `prefix`: The prefix for localization calls (e.g., AppLocalization.of(context)).
3. `run_flutter_gen`: Whether to run flutter gen-l10n automatically (true or false).

## 📖 Usage

### 1. Generate Localization Key

1. **Select Text:** Highlight the text in your editor that you want to localize.
2. **Right-Click:** Choose **"Create Localization Key"** from the context menu.
3. **Fill the Prompt:**
   - **Key Name:** Default is a camelCase version of the selected text.
   - For interpolated strings, define placeholder types (e.g., `String`, `int`).

### 2. Automatic ARB File Updates

The generated key and its value will be added to all ARB files defined in your configuration. For example:

```json
{
  "helloUsername": "Hello, {username}!",
  "@helloUsername": {
    "placeholders": {
      "username": {
        "type": "String"
      }
    }
  }
}
```

### 3. Replace Selected Text

After generating the key, the selected text will be replaced with a localization call. For example:

#### Input

```dart
"Hello, $username!"
```

#### Output

```dart
AppLocalization.of(context).helloUsername(username)
```

### 4. Automatically Run flutter gen-l10n

If enabled in the `extract_localization_config.yaml`, the extension will automatically execute `flutter gen-l10n` after updating ARB files. This ensures your localization changes are immediately applied.

## 📜 License

This extension is licensed under the MIT License
