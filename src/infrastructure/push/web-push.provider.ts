import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { AppConfig } from '../../config/configuration';

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface NotificationPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
}

export type SendResult =
  | { ok: true }
  | { ok: false; pruned: true } // 404 or 410 — subscription dead
  | { ok: false; retriable: true; retryAfter?: number } // 429
  | { ok: false; error: string };

/**
 * Web Push (VAPID) provider.
 *
 * Phase 0: a thin wrapper around `web-push` with structured result
 * types so the queue worker (Phase 5) can branch on
 * `pruned` vs `retriable` vs `error`.
 */
@Injectable()
export class WebPushProvider {
  private readonly logger = new Logger(WebPushProvider.name);
  private configured = false;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const publicKey = config.get('vapid.publicKey', { infer: true });
    const privateKey = config.get('vapid.privateKey', { infer: true });
    const subject = config.get('vapid.subject', { infer: true });

    if (publicKey && privateKey && subject) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.configured = true;
        this.logger.log('VAPID configured.');
      } catch (err) {
        this.logger.warn(
          `VAPID configuration rejected by web-push library: ${(err as Error).message}. ` +
            'Push notifications will be disabled until valid keys are provided.',
        );
      }
    } else {
      this.logger.warn(
        'VAPID keys not configured — push notifications will fail. ' +
          'Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.',
      );
    }
  }

  async send(subscription: PushSubscription, payload: NotificationPayload): Promise<SendResult> {
    if (!this.configured) {
      return { ok: false, error: 'VAPID_NOT_CONFIGURED' };
    }

    try {
      await webpush.sendNotification(
        subscription as unknown as webpush.PushSubscription,
        JSON.stringify(payload),
      );
      return { ok: true };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        return { ok: false, pruned: true };
      }
      if (status === 429) {
        const retryAfter = Number(
          (err as { headers?: Record<string, string> }).headers?.['retry-after'],
        );
        return {
          ok: false,
          retriable: true,
          retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined,
        };
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`web-push failed: ${message}`);
      return { ok: false, error: message };
    }
  }
}
