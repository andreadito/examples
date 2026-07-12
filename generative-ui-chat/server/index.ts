import Anthropic from '@anthropic-ai/sdk';
import { createApp, type ClaudeClient } from './app';

const port = Number(process.env.PORT || 8787);
const app = createApp(new Anthropic() as unknown as ClaudeClient);
app.listen(port, () => {
  console.log(`claude proxy listening on http://localhost:${port}`);
});
