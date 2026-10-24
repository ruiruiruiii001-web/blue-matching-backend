const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());
app.use(cors());

// Anthropic クライアントの初期化（環境変数からAPIキーを自動読み込み）
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/ai', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'プロンプトがありません。' });
  }

  // SSE（Server-Sent Events）のヘッダー設定
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Claude API のストリーミングリクエスト
    const stream = await anthropic.messages.stream({
      model: 'claude-3-5-sonnet-20241022', // または claude-3-haiku-20240307 など
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta &&
        chunk.delta.type === 'text_delta'
      ) {
        const text = chunk.delta.text;
        // プレーンテキストとしてクライアントへ逐次送信
        res.write(text);
      }
    }

    res.end();
  } catch (error) {
    console.error('Claude API Error:', error);
    res.write(`\n[エラーが発生しました: ${error.message}]`);
    res.end();
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});