// Disabled integrations need no deployed credentials. Generated Wrangler types
// contain only required secrets; optional provider secrets remain explicit here.
declare global {
  namespace Cloudflare {
    interface Env {
      NOTION_ACCESS_TOKEN?: string;
      TELEGRAM_BOT_TOKEN?: string;
      TELEGRAM_CHAT_ID?: string;
    }
  }
}

export {};
