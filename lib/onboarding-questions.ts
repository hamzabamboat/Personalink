export type McqQuestion = { id: string; q: string; options: string[] }

export const MCQ_QUESTIONS: McqQuestion[] = [
  { id: 'voice_style', q: 'How would you describe your professional voice?', options: ['Formal', 'Conversational', 'Inspirational', 'Educational', 'Humorous'] },
  { id: 'main_goal', q: 'What is your main goal on LinkedIn?', options: ['Build personal brand', 'Generate leads', 'Find a job', 'Share knowledge', 'Grow network'] },
  { id: 'personal_stories', q: 'How comfortable are you sharing personal stories?', options: ['Very comfortable', 'Somewhat comfortable', 'Prefer professional only'] },
  { id: 'content_type', q: 'What content do you enjoy reading on LinkedIn?', options: ['Long stories', 'Quick tips', 'Data insights', 'Controversial takes', 'Behind the scenes'] },
  { id: 'known_as', q: 'How do you want to be known?', options: ['The Expert', 'The Leader', 'The Storyteller', 'The Innovator', 'The Connector'] },
]

export const MULTI_SELECT_QUESTIONS = ['voice_style', 'content_type']
