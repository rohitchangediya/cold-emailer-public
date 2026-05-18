const PIXEL_BYTES = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (char) => char.charCodeAt(0)
);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/open") {
      const trackingId = url.searchParams.get("id");
      if (trackingId) {
        ctx.waitUntil(
          sendEvent(env, {
            type: "open",
            trackingId,
          })
        );
      }

      return new Response(PIXEL_BYTES, {
        headers: {
          "content-type": "image/gif",
          "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
    }

    if (url.pathname === "/click") {
      const trackingId = url.searchParams.get("id");
      const destination = url.searchParams.get("url");

      if (!destination) {
        return new Response("Missing url", { status: 400 });
      }

      if (trackingId) {
        ctx.waitUntil(
          sendEvent(env, {
            type: "click",
            trackingId,
            url: destination,
          })
        );
      }

      return Response.redirect(destination, 302);
    }

    if (url.pathname === "/unsubscribe") {
      const trackingId = url.searchParams.get("id");
      const destination = url.searchParams.get("url");

      if (trackingId) {
        ctx.waitUntil(
          sendEvent(env, {
            type: "unsubscribe",
            trackingId,
            url: destination || "",
          })
        );
      }

      if (destination) {
        return Response.redirect(destination, 302);
      }

      return new Response(
        "<html><body><p>You have been unsubscribed.</p></body></html>",
        {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "cold-email-tracker" });
    }

    if (url.pathname === "/unsubscribe") {
      const email = url.searchParams.get("email");
      if (!email) {
        return new Response("Missing email parameter", { status: 400 });
      }

      ctx.waitUntil(
        sendEvent(env, {
          type: "unsubscribe",
          email: decodeURIComponent(email),
        })
      );

      return new Response(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="3;url=https://google.com"></head><body><p>You have been unsubscribed. Redirecting...</p></body></html>`,
        {
          headers: { "content-type": "text/html" },
          status: 200,
        }
      );
    }

    return new Response("Not found", { status: 404 });
  },
};

async function sendEvent(env, payload) {
  if (!env.APPS_SCRIPT_WEBHOOK_URL || !env.TRACKING_WEBHOOK_SECRET) {
    console.log("Missing worker secrets for tracking webhook");
    return;
  }

  const response = await fetch(env.APPS_SCRIPT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      secret: env.TRACKING_WEBHOOK_SECRET,
      occurredAt: new Date().toISOString(),
    }),
  });

  const responseText = await response.text();

  let parsed = null;
  try {
    parsed = JSON.parse(responseText);
  } catch (err) {
    parsed = null;
  }

  if (!response.ok) {
    console.log("Tracking webhook failed", response.status, responseText);
    return;
  }

  if (parsed && parsed.ok === false) {
    console.log("Tracking webhook rejected event", payload.type, parsed.error || parsed);
  }
}
