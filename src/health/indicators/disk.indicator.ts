import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

const FREE_BYTES_THRESHOLD = 1 * 1024 * 1024 * 1024; // 1 GiB

/**
 * Checks that the storage directory exists, is writable, and has
 * at least 1 GiB free.
 *
 * Uses `statfs` (Linux/macOS) for a fast stat. Falls back to a
 * `writeFile` smoke test on other platforms.
 */
@Injectable()
export class DiskHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DiskHealthIndicator.name);
  private readonly storageDir: string;

  constructor(config: ConfigService<AppConfig, true>) {
    super();
    this.storageDir = path.resolve(config.get('storageDir', { infer: true }));
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      // statfs is available on Linux/macOS Node ≥ 18.
      const stats = await fs.statfs(this.storageDir);
      const freeBytes = stats.bavail * stats.bsize;

      const result = this.getStatus(key, freeBytes >= FREE_BYTES_THRESHOLD, {
        storageDir: this.storageDir,
        freeBytes,
        freeGb: Number((freeBytes / 1024 / 1024 / 1024).toFixed(2)),
        thresholdGb: Number((FREE_BYTES_THRESHOLD / 1024 / 1024 / 1024).toFixed(2)),
      });

      if (freeBytes < FREE_BYTES_THRESHOLD) {
        throw new HealthCheckError('Low disk space', result);
      }
      return result;
    } catch (err) {
      if (err instanceof HealthCheckError) throw err;
      this.logger.error('Disk health check failed.', err as Error);
      throw new HealthCheckError(
        'Disk check failed',
        this.getStatus(key, false, { message: (err as Error).message }),
      );
    }
  }
}
