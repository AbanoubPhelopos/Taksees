import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { LocalStorageService } from './local-storage.service';

/**
 * Provides the local-filesystem implementation of `IFileStorage`.
 * In Phase 0 the only consumer is the absence worker (Phase 4).
 */
@Global()
@Module({
  providers: [
    {
      provide: LocalStorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const storageDir = config.get('storageDir', { infer: true });
        return new LocalStorageService(storageDir);
      },
    },
  ],
  exports: [LocalStorageService],
})
export class StorageModule {}
