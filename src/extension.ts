import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6010'] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'twge' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.twge'),
    },
  };

  client = new LanguageClient(
    'twgeLanguageServer',
    'TWGE Language Server',
    serverOptions,
    clientOptions
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('twge-lsp.restartServer', async () => {
      if (!client) {
        return;
      }

      await client.stop();
      await client.start();
      void vscode.window.showInformationMessage('TWGE language server restarted.');
    })
  );

  await client.start();
}

export async function deactivate(): Promise<void> {
  if (!client) {
    return;
  }

  await client.stop();
  client = undefined;
}
