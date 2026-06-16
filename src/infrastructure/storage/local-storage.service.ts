import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export interface PutResult {
  /** Path relative to STORAGE_DIR. */
  key: string;
  /** Absolute path on disk. */
  absPath: string;
  /** URL the client can use to fetch the file. */
  url: string;
}

/**
 * Local-filesystem implementation of `IFileStorage`.
 *
 * Path-traversal safe: keys are normalised and rejected if they
 * escape the storage root.
 *
 * In Phase 4 the `get`, `signedUrl`, and `delete` methods are
 * fully implemented. Phase 0 ships a working `put` so the worker
 * can write files once a session closes; the read path is added
 * with the absence-reports module.
 */
@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly root: string;

  constructor(rootDir: string) {
    this.root = path.resolve(rootDir);
  }

  /**
   * Resolve and validate a relative key. Throws if the key tries to
   * escape the storage root.
   */
  private resolveKey(key: string): string {
    if (!key || key.includes('\0')) {
      throw new Error('Invalid storage key.');
    }
    if (key.startsWith('/') || key.startsWith('\\')) {
      throw new Error(`Storage key must be relative: ${key}`);
    }
    const normalised = path.posix.normalize(key);
    if (normalised === '..' || normalised.startsWith('../')) {
      throw new Error(`Storage key escapes root: ${key}`);
    }
    const abs = path.resolve(this.root, normalised);
    if (abs !== this.root && !abs.startsWith(this.root + path.sep)) {
      throw new Error(`Storage key escapes root: ${key}`);
    }
    return abs;
  }

  async put(key: string, buffer: Buffer, _mime: string): Promise<PutResult> {
    const absPath = this.resolveKey(key);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, buffer);
    this.logger.debug(`Stored ${buffer.length} bytes at ${absPath}`);
    return { key, absPath, url: `/api/files/${encodeURIComponent(key)}` };
  }

  async get(key: string): Promise<Buffer> {
    const absPath = this.resolveKey(key);
    return fs.readFile(absPath);
  }

  async delete(key: string): Promise<void> {
    const absPath = this.resolveKey(key);
    await fs.unlink(absPath).catch(() => undefined);
  }

  async exists(key: string): Promise<boolean> {
    const absPath = this.resolveKey(key);
    try {
      await fs.access(absPath);
      return true;
    } catch {
      return false;
    }
  }
}
