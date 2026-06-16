import { Global, Module } from '@nestjs/common';
import { WebPushProvider } from './web-push.provider';

/**
 * Provides the web-push (VAPID) implementation of `IPushProvider`.
 * Phase 0 ships a working single provider. Adding a second provider
 * later is a matter of binding `IPushProvider` to a router.
 */
@Global()
@Module({
  providers: [WebPushProvider],
  exports: [WebPushProvider],
})
export class PushModule {}
