import type { RunAgentInput } from '@ag-ui/core';
import { EventEncoder } from '@ag-ui/encoder';
import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RunService } from './run.service.js';

/*
 * Step 5: the single endpoint every Hashbrown resource talks to. With the global 'api' prefix
 * from main.ts, this is POST /api/run.
 *
 * Hashbrown speaks AG-UI, an open protocol for agent UIs. A basic chat request body looks like:
 *
 *   {
 *     "threadId": "…", "runId": "…",
 *     "messages": [
 *       { "id": "…", "role": "system", "content": "You are a friendly assistant…" },
 *       { "id": "…", "role": "user",   "content": "Say hi in five words." }
 *     ],
 *     "tools": [], "context": [], "state": {}, "forwardedProps": {}
 *   }
 *
 * The response is a server-sent events stream with one AG-UI event per `data:` line:
 *
 *   data: {"type":"RUN_STARTED","threadId":"…","runId":"…"}
 *   data: {"type":"TEXT_MESSAGE_START","messageId":"…","role":"assistant"}
 *   data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"…","delta":"Hello and welcome"}   (repeats)
 *   data: {"type":"TEXT_MESSAGE_END","messageId":"…"}
 *   data: {"type":"RUN_FINISHED","threadId":"…","runId":"…"}
 *
 * Step 7 happens in the browser: Hashbrown appends each TEXT_MESSAGE_CONTENT delta to the
 * assistant message, which updates chat.value() and re-renders the template.
 */
@Controller('run')
export class RunController {
  constructor(private readonly runService: RunService) {}

  // @Res() hands this method the raw Express response, so it can write the stream itself instead
  // of returning one JSON value.
  @Post()
  async run(@Body() input: RunAgentInput, @Res() res: Response): Promise<void> {
    // When the user presses Stop or leaves the page, the browser closes the connection.
    // Aborting this controller then cancels the Gemini request, so you don't pay for unread tokens.
    const abortController = new AbortController();
    res.once('close', () => abortController.abort());

    // Throws a 503 before anything is written when no API key is configured, so the
    // browser gets a normal HTTP error rather than a broken stream.
    const events = this.runService.stream(input, abortController.signal);
    const encoder = new EventEncoder();

    // Send the headers now, so the browser starts reading before the first token exists.
    res.status(200);
    res.setHeader('Content-Type', encoder.getContentType());
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      // Each event is written the moment the model produces it. That is what makes text
      // appear word by word in the UI instead of all at once.
      for await (const event of events) {
        res.write(encoder.encodeSSE(event));
      }
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  }
}
