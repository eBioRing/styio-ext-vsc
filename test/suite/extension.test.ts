import * as assert from 'node:assert';
import * as vscode from 'vscode';

function hasServerEnvironment(): boolean {
  return Boolean(process.env.STYIO_LSPD_PATH || process.env.STYIO_NIGHTLY_ROOT);
}

async function waitFor<T>(
  producer: () => T | Thenable<T>,
  predicate: (value: T) => boolean,
  label = 'expected VS Code state'
): Promise<T> {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const value = await producer();
    if (predicate(value)) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const finalValue = await producer();
  assert.ok(predicate(finalValue), `Timed out waiting for ${label}.`);
  return finalValue;
}

function hasItems<T>(items: T[] | undefined): items is T[] {
  return Array.isArray(items) && items.length > 0;
}

suite('Styio extension', function () {
  setup(async function () {
    if (!hasServerEnvironment()) {
      this.skip();
    }
    const extension = vscode.extensions.getExtension('eBioRing.styio-language-support');
    assert.ok(extension, 'extension should be registered');
    await extension.activate();
  });

  test('provides LSP language features through VS Code commands', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'fixture workspace should be open');

    const uri = vscode.Uri.joinPath(workspaceFolder.uri, 'main.styio');
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    const completions = await waitFor(
      () =>
        vscode.commands.executeCommand<vscode.CompletionList>(
          'vscode.executeCompletionItemProvider',
          uri,
          new vscode.Position(3, 14)
        ),
      (value) => Boolean(value?.items.some((item) => item.label === 'i32')),
      'completion item i32'
    );
    assert.ok(completions.items.some((item) => item.label === 'i32'));

    const hovers = await waitFor(
      () =>
        vscode.commands.executeCommand<vscode.Hover[]>(
          'vscode.executeHoverProvider',
          uri,
          new vscode.Position(2, 16)
        ),
      hasItems,
      'hover information'
    );
    assert.ok(hovers.length > 0);

    const definitions = await waitFor(
      () =>
        vscode.commands.executeCommand<vscode.Location[]>(
          'vscode.executeDefinitionProvider',
          uri,
          new vscode.Position(2, 16)
        ),
      hasItems,
      'definitions'
    );
    assert.ok(definitions.length > 0);

    const references = await waitFor(
      () =>
        vscode.commands.executeCommand<vscode.Location[]>(
          'vscode.executeReferenceProvider',
          uri,
          new vscode.Position(2, 16)
        ),
      hasItems,
      'references'
    );
    assert.ok(references.length > 0);

    const symbols = await waitFor(
      () =>
        vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
          'vscode.executeDocumentSymbolProvider',
          uri
        ),
      hasItems,
      'document symbols'
    );
    assert.ok(symbols.length > 0);

    const workspaceSymbols = await waitFor(
      () =>
        vscode.commands.executeCommand<vscode.SymbolInformation[]>(
          'vscode.executeWorkspaceSymbolProvider',
          'add'
        ),
      hasItems,
      'workspace symbols'
    );
    assert.ok(workspaceSymbols.length > 0);

    try {
      const semanticTokens = await vscode.commands.executeCommand<unknown>(
        'vscode.provideDocumentSemanticTokens',
        uri
      );
      assert.ok(semanticTokens, 'semantic token provider should return a result');
    } catch (error) {
      console.warn(`Semantic token command is unavailable in this VS Code build: ${String(error)}`);
    }
  });

  test('publishes diagnostics for malformed Styio', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'fixture workspace should be open');

    const uri = vscode.Uri.joinPath(workspaceFolder.uri, 'bad.styio');
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    const diagnostics = await waitFor(
      () => vscode.languages.getDiagnostics(uri),
      (items) => items.length > 0
    );
    assert.ok(diagnostics.some((diagnostic) => diagnostic.source?.includes('styio')));
  });
});
