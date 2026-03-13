export const CLIENT_MARKER = 'data-express-templates-reload';

export function createClientScript(
  reloadPath: string,
  clientQuiet: boolean,
): string {
  return `
    <script ${CLIENT_MARKER}>
        (function() {
            let ws = null;
            let reconnectAttempts = 0;
            let closing = false;
            const MAX_RECONNECT_ATTEMPTS = 3;
            const quiet = ${clientQuiet ? 'true' : 'false'};
            const reloadPath = ${JSON.stringify(reloadPath)};

            function log(message) {
                if (!quiet) {
                    console.log(message);
                }
            }

            function connect() {
                if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    log('[express-templates-reload] Max reconnection attempts reached. Stopping auto-reload.');
                    return;
                }

                const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
                ws = new WebSocket(protocol + '//' + location.host + reloadPath);

                ws.onopen = function() {
                    log('[express-templates-reload] Browser connected for auto-reload');
                    reconnectAttempts = 0;
                };

                ws.onmessage = function(event) {
                    if (event.data === 'reload') {
                        log('[express-templates-reload] Reloading browser');
                        location.reload();
                    }
                };

                ws.onclose = function() {
                    if (closing) return;
                    reconnectAttempts++;
                    log('[express-templates-reload] Connection lost, reconnecting... (attempt ' + reconnectAttempts + ' of ' + MAX_RECONNECT_ATTEMPTS + ')');
                    setTimeout(connect, 1000);
                };

                ws.onerror = function() {};
            }

            connect();

            window.addEventListener('beforeunload', function() {
                closing = true;
                if (ws) ws.close();
            });
        })();
    </script>`;
}

export function injectClientScript(body: string, clientScript: string): string {
  if (body.includes(CLIENT_MARKER)) {
    return body;
  }

  if (/<\/head>/i.test(body)) {
    return body.replace(/<\/head>/i, `${clientScript}</head>`);
  }

  if (/<\/body>/i.test(body)) {
    return body.replace(/<\/body>/i, `${clientScript}</body>`);
  }

  if (/<html[\s>]|<!doctype html/i.test(body)) {
    return `${body}${clientScript}`;
  }

  return body;
}
