import * as assert from 'node:assert';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

class LspConnection {
  private readonly process: ChildProcessWithoutNullStreams;
  private buffer = Buffer.alloc(0);
  private readonly pending = new Map<number | string, (message: JsonRpcMessage) => void>();
  private nextId = 1;
  readonly notifications: JsonRpcMessage[] = [];

  constructor(command: string, cwd: string) {
    this.process = spawn(command, [], { cwd });
    this.process.stdout.on('data', (chunk) => this.handleData(chunk));
    this.process.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });
  }

  async stop(): Promise<void> {
    this.process.kill();
  }

  notify(method: string, params?: unknown): void {
    this.write({ jsonrpc: '2.0', method, params });
  }

  request(method: string, params?: unknown, timeoutMs = 10000): Promise<JsonRpcMessage> {
    const id = this.nextId++;
    const promise = new Promise<JsonRpcMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      this.pending.set(id, (message) => {
        clearTimeout(timeout);
        resolve(message);
      });
    });
    this.write({ jsonrpc: '2.0', id, method, params });
    return promise;
  }

  private write(message: JsonRpcMessage): void {
    const body = JSON.stringify(message);
    this.process.stdin.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
  }

  private headerBoundary(): number | undefined {
    const crlfBoundary = this.buffer.indexOf(Buffer.from('\r\n\r\n'));
    const malformedWindowsBoundary = this.buffer.indexOf(Buffer.from('\r\r\n\r\r\n'));
    const lfOnlyBoundary = this.buffer.indexOf(Buffer.from('\n\n'));

    if (
      malformedWindowsBoundary >= 0 &&
      (crlfBoundary < 0 || malformedWindowsBoundary <= crlfBoundary)
    ) {
      assert.fail('styio_lspd emitted malformed Windows text-mode LSP framing: \\r\\r\\n\\r\\r\\n');
    }

    if (lfOnlyBoundary >= 0 && (crlfBoundary < 0 || lfOnlyBoundary < crlfBoundary)) {
      assert.fail('styio_lspd emitted non-standard LSP framing: \\n\\n');
    }

    return crlfBoundary >= 0 ? crlfBoundary : undefined;
  }

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const boundaryIndex = this.headerBoundary();
      if (boundaryIndex === undefined) {
        return;
      }

      const header = this.buffer.subarray(0, boundaryIndex).toString('utf8');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      assert.ok(match, `Missing Content-Length header: ${header}`);

      const length = Number(match[1]);
      const messageStart = boundaryIndex + 4;
      const messageEnd = messageStart + length;
      if (this.buffer.length < messageEnd) {
        return;
      }

      const body = this.buffer.subarray(messageStart, messageEnd).toString('utf8');
      this.buffer = this.buffer.subarray(messageEnd);
      this.dispatch(JSON.parse(body) as JsonRpcMessage);
    }
  }

  private dispatch(message: JsonRpcMessage): void {
    if (message.id !== undefined) {
      const resolver = this.pending.get(message.id);
      if (resolver) {
        this.pending.delete(message.id);
        resolver(message);
        return;
      }
    }
    this.notifications.push(message);
  }
}

function resolveServer(): string {
  const explicit = process.env.STYIO_LSPD_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  throw new Error('STYIO_LSPD_PATH must point to a built styio_lspd for npm run test:lsp-wire.');
}

function assertArrayResult(message: JsonRpcMessage, label: string): unknown[] {
  assert.ifError(message.error);
  assert.ok(Array.isArray(message.result), `${label} should return an array`);
  return message.result as unknown[];
}

async function main(): Promise<void> {
  const serverPath = resolveServer();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'styio-vscode-lsp-'));
  const filePath = path.join(root, 'server_navigation_sample.styio');
  const uri = pathToFileURL(filePath).toString();
  const rootUri = pathToFileURL(root).toString();
  const source = [
    '# add := (a: i32, b: i32) => a + b',
    'emoji_text := "smile"',
    'result: i32 := add(1, 2)',
    'typed_value: i'
  ].join('\n');
  fs.writeFileSync(filePath, source, 'utf8');

  const connection = new LspConnection(serverPath, root);
  try {
    const initialize = await connection.request('initialize', {
      processId: process.pid,
      rootUri,
      capabilities: {},
      trace: 'off'
    });
    assert.ifError(initialize.error);
    assert.ok(initialize.result, 'initialize should return capabilities');

    connection.notify('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId: 'styio',
        version: 1,
        text: source
      }
    });

    const completion = assertArrayResult(
      await connection.request('textDocument/completion', {
        textDocument: { uri },
        position: { line: 3, character: 13 }
      }),
      'completion'
    );
    assert.ok(
      completion.some((item) => (item as { label?: string }).label === 'i32'),
      'completion should include i32'
    );

    const hover = await connection.request('textDocument/hover', {
      textDocument: { uri },
      position: { line: 2, character: 16 }
    });
    assert.ifError(hover.error);
    assert.ok(JSON.stringify(hover.result).includes('add'), 'hover should mention add');

    const definitions = assertArrayResult(
      await connection.request('textDocument/definition', {
        textDocument: { uri },
        position: { line: 2, character: 16 }
      }),
      'definition'
    );
    assert.ok(definitions.length > 0, 'definition should not be empty');

    const references = assertArrayResult(
      await connection.request('textDocument/references', {
        textDocument: { uri },
        position: { line: 2, character: 16 },
        context: { includeDeclaration: true }
      }),
      'references'
    );
    assert.ok(references.length > 0, 'references should not be empty');

    const documentSymbols = assertArrayResult(
      await connection.request('textDocument/documentSymbol', {
        textDocument: { uri }
      }),
      'documentSymbol'
    );
    assert.ok(documentSymbols.length > 0, 'document symbols should not be empty');

    const workspaceSymbols = assertArrayResult(
      await connection.request('workspace/symbol', { query: 'add' }),
      'workspace/symbol'
    );
    assert.ok(workspaceSymbols.length > 0, 'workspace symbols should not be empty');

    const semanticTokens = await connection.request('textDocument/semanticTokens/full', {
      textDocument: { uri }
    });
    assert.ifError(semanticTokens.error);
    const semanticResult = semanticTokens.result as { data?: unknown[] };
    assert.ok(Array.isArray(semanticResult?.data), 'semantic tokens should include data array');

    console.log('styio_lspd wire test passed.');
  } finally {
    await connection.stop();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
