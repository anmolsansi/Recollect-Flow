import { createApp } from './app';
import { D1AttachmentRepository } from './attachments/attachment.repository';
import { cleanupExpiredAttachments } from './attachments/attachment.service';

const app = createApp();

export default {
  fetch: app.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: Cloudflare.Env,
    context: ExecutionContext,
  ) {
    context.waitUntil(
      cleanupExpiredAttachments(
        new D1AttachmentRepository(env.DB),
        env.ATTACHMENTS,
      ),
    );
  },
};
