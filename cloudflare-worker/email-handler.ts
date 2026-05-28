import PostalMime from 'postal-mime'

interface Env {
  WEBHOOK_URL: string
  INBOUND_SECRET: string
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default {
  async email(message: any, env: Env): Promise<void> {
    const rawBuffer = await new Response(message.raw).arrayBuffer()
    const parser = new PostalMime()
    const parsed = await parser.parse(rawBuffer)

    const bodyText = parsed.text || (parsed.html ? stripHtml(parsed.html) : '')

    await fetch(env.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-inbound-secret': env.INBOUND_SECRET,
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: parsed.subject ?? '(no subject)',
        text: bodyText.slice(0, 8000),
        messageId: parsed.messageId ?? '',
      }),
    })
  },
}
