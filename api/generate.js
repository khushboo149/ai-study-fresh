export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const prompt = `Generate structured study notes for the topic: "${topic}"

Format the response as a JSON object with this exact structure:
{
  "definition": "A short, clear definition (1-2 sentences)",
  "points": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "terms": ["Term1", "Term2", "Term3", "Term4", "Term5"]
}

Requirements:
- Definition should be concise and beginner-friendly
- Include exactly 4-5 bullet points explaining the topic
- Include exactly 4-5 key terms related to the topic
- Make it educational and easy to understand
- Return ONLY valid JSON, no additional text`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful study assistant. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'OpenAI API error' 
      });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated' });
    }

    let studyNotes;
    try {
      studyNotes = JSON.parse(content);
    } catch (parseError) {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    if (!studyNotes.definition || !studyNotes.points || !studyNotes.terms) {
      return res.status(500).json({ error: 'Invalid response format' });
    }

    return res.status(200).json(studyNotes);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

