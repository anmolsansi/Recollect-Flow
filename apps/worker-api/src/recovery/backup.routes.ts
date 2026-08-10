import { Hono } from 'hono';

import type { AppContext } from '../env';
import { requireAdminToken } from '../shared/auth';
import { BackupService } from './backup.service';

export function backupRoutes() {
  const router = new Hono<AppContext>();

  router.post('/backups', requireAdminToken, async (context) => {
    const backup = await new BackupService(
      context.env.DB,
      context.env.ATTACHMENTS,
    ).createHostedBackup();
    return context.json(
      {
        data: backup,
        meta: { request_id: context.get('requestId') },
      },
      201,
    );
  });

  router.get('/backups', requireAdminToken, async (context) => {
    const backups = await new BackupService(
      context.env.DB,
      context.env.ATTACHMENTS,
    ).listHostedBackups();
    return context.json({
      data: { backups },
      meta: { request_id: context.get('requestId') },
    });
  });

  router.get('/backups/:id/download', requireAdminToken, async (context) => {
    const backup = await new BackupService(
      context.env.DB,
      context.env.ATTACHMENTS,
    ).readHostedBackup(context.req.param('id'));
    return context.body(backup.content, 200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="recollectflow-backup-${backup.artifact.id}.json"`,
      'X-RecollectFlow-Backup-SHA256': backup.artifact.sha256 ?? '',
    });
  });

  return router;
}
