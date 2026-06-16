import { LocalStorageService } from './local-storage.service';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('LocalStorageService', () => {
  let root: string;
  let svc: LocalStorageService;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'taksees-storage-'));
    svc = new LocalStorageService(root);
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  describe('put / get / exists / delete', () => {
    it('writes and reads back a buffer', async () => {
      const buf = Buffer.from('hello world');
      const result = await svc.put('greet.txt', buf, 'text/plain');

      expect(result.key).toBe('greet.txt');
      expect(result.absPath).toBe(path.join(root, 'greet.txt'));
      expect(result.url).toBe('/api/files/greet.txt');

      const read = await svc.get('greet.txt');
      expect(read.toString()).toBe('hello world');

      expect(await svc.exists('greet.txt')).toBe(true);
    });

    it('creates nested directories on the fly', async () => {
      await svc.put('a/b/c/file.bin', Buffer.from([1, 2, 3]), 'application/octet-stream');
      expect(await svc.exists('a/b/c/file.bin')).toBe(true);
    });

    it('returns false from exists for missing files', async () => {
      expect(await svc.exists('nope.txt')).toBe(false);
    });

    it('deletes an existing file', async () => {
      await svc.put('doomed.txt', Buffer.from('bye'), 'text/plain');
      await svc.delete('doomed.txt');
      expect(await svc.exists('doomed.txt')).toBe(false);
    });

    it('delete on a missing file is a no-op', async () => {
      await expect(svc.delete('ghost.txt')).resolves.toBeUndefined();
    });
  });

  describe('path traversal protection', () => {
    it.each([
      ['../escape.txt', /escapes root/],
      ['a/../../escape.txt', /escapes root/],
      ['/etc/passwd', /must be relative/],
      ['a//../../escape.txt', /escapes root/],
    ])('rejects key %s', async (badKey, expected) => {
      await expect(svc.put(badKey, Buffer.from('x'), 'text/plain')).rejects.toThrow(expected);
    });

    it('rejects null bytes in the key', async () => {
      await expect(svc.put('a\0b', Buffer.from('x'), 'text/plain')).rejects.toThrow(
        /Invalid storage key/,
      );
    });
  });
});
