import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('audio') as File | null

  if (!file) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })

  const MAX_SIZE = 25 * 1024 * 1024 // 25MB Whisper limit
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 })
  }

  const { data: voiceNote, error: insertError } = await supabaseAdmin
    .from('voice_notes')
    .insert({
      user_id: user.id,
      file_name: file.name,
      status: 'pending',
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  try {
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
    })

    await supabaseAdmin
      .from('voice_notes')
      .update({ transcript: transcription.text, status: 'transcribed' })
      .eq('id', voiceNote.id)

    return NextResponse.json({
      voiceNoteId: voiceNote.id,
      transcript: transcription.text,
    })
  } catch (err) {
    await supabaseAdmin
      .from('voice_notes')
      .update({ status: 'failed' })
      .eq('id', voiceNote.id)

    console.error('Whisper transcription error:', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
